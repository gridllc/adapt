
import { onCall, HttpsError } from "firebase-functions/v2/on_call";
import * as admin from "firebase-admin";
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

// --- AI Client & Embedding Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a vector embedding for a given text.
 * @param {string} text The text to embed.
 * @return {Promise<number[]>} A promise that resolves to the embedding vector.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: { parts: [{ text }] },
    });

    if (!result.embeddings || !result.embeddings[0]?.values) {
      throw new Error("No embedding returned from Vertex AI");
    }
    return result.embeddings[0].values;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    const message = e instanceof Error ? e.message : "Failed to generate embedding.";
    throw new HttpsError("internal", message);
  }
}

// --- Utility: Cosine Similarity ---
const cosineSimilarity = (a: number[], b: number[]): number => {
  if (!a || !b || a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return (magA === 0 || magB === 0) ? 0 : dotProduct / (magA * magB);
};


// --- Module Data Functions ---

export const getModule = onCall<{ moduleId: string }, Promise<any>>(
  async (request) => {
    const { moduleId } = request.data;
    if (!moduleId) {
      throw new HttpsError("invalid-argument", "A module ID must be provided.");
    }
    const doc = await db.collection("modules").doc(moduleId).get();
    if (!doc.exists) {
      throw new HttpsError("not-found", `Module with ID ${moduleId} not found.`);
    }
    return doc.data();
  },
);

export const getAvailableModules = onCall(async () => {
  const modulesSnapshot = await db.collection("modules").get();
  return modulesSnapshot.docs.map((doc) => ({
    ...doc.data(),
    slug: doc.id,
    is_ai_generated: doc.data().metadata?.generated_by_ai ?? false,
  }));
});

export const getSignedUploadUrl = onCall<{ slug: string; contentType: string; fileExtension: string }, Promise<{ uploadUrl: string, filePath: string }>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { slug, contentType, fileExtension } = request.data;
    const filePath = `videos/${uid}/${slug}.${fileExtension}`;
    const file = storage.bucket().file(filePath);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });
    return { uploadUrl: url, filePath };
  },
);

export const getSignedDownloadUrl = onCall<{ filePath: string }, Promise<{ downloadUrl: string }>>(
  async (request) => {
    const { filePath } = request.data;
    const file = storage.bucket().file(filePath);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    return { downloadUrl: url };
  },
);

export const saveModule = onCall<{ moduleData: any }, Promise<any>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { moduleData } = request.data;
    if (!moduleData || !moduleData.slug) {
      throw new HttpsError("invalid-argument", "Module data with a slug is required.");
    }
    const moduleRef = db.collection("modules").doc(moduleData.slug);
    const doc = await moduleRef.get();
    if (doc.exists && doc.data()?.user_id !== uid) {
      throw new HttpsError("permission-denied", "You don't own this module.");
    }
    const dataToSave = {
      ...moduleData,
      user_id: uid,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!doc.exists) {
      dataToSave.created_at = admin.firestore.FieldValue.serverTimestamp();
    }
    await moduleRef.set(dataToSave, { merge: true });
    return { ...doc.data(), ...dataToSave };
  },
);

export const deleteModule = onCall<{ slug: string }, Promise<{ success: boolean }>>(
  async (request) => {
    const uid = request.auth?.uid;
    const { slug } = request.data;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (!slug) {
      throw new HttpsError("invalid-argument", "A module slug is required.");
    }
    const moduleRef = db.collection("modules").doc(slug);
    const moduleDoc = await moduleRef.get();
    if (!moduleDoc.exists || moduleDoc.data()?.user_id !== uid) {
      throw new HttpsError("permission-denied", "You can't delete this module.");
    }
    const moduleData = moduleDoc.data();
    if (moduleData?.video_url) {
      try {
        await storage.bucket().file(moduleData.video_url).delete();
      } catch (e) {
        console.error(`GCS delete failed for ${moduleData.video_url}`, e);
      }
    }
    // Batch delete sub-collections in the future if needed
    await moduleRef.delete();
    return { success: true };
  },
);

// --- AI & Analytics Functions ---

export const logTutorInteraction = onCall<{ userQuestion: string; tutorResponse: string; moduleId: string; stepIndex: number }, Promise<{ status: string }>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { userQuestion, tutorResponse, moduleId, stepIndex } = request.data;
    const vector = await generateEmbedding(userQuestion);
    await db.collection("tutorLogs").add({
      uid,
      user_question: userQuestion,
      tutor_response: tutorResponse,
      module_id: moduleId,
      step_index: stepIndex,
      vector,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { status: "logged" };
  },
);

export const findSimilarInteractions = onCall<{ question: string; moduleId: string }, Promise<any[]>>(
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { question, moduleId } = request.data;
    const queryVector = await generateEmbedding(question);
    const snapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).get();
    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      const similarity = cosineSimilarity(queryVector, data.vector);
      return { ...data, id: doc.id, similarity };
    });
    return results.filter((r) => r.similarity > 0.8).sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  },
);

const refinementSchema = {
  type: Type.OBJECT,
  properties: {
    newDescription: {
      type: Type.STRING,
      description: "The rewritten, clearer step description that addresses the user's points of confusion.",
    },
    newAlternativeMethod: {
      type: Type.OBJECT,
      nullable: true,
      description: "If a completely new alternative method is warranted by the confusion, define it here. Otherwise, null.",
      properties: {
        title: { type: Type.STRING, description: "A title for the new alternative method." },
        description: { type: Type.STRING, description: "The description for the new alternative method." },
      },
    },
  },
  required: ["newDescription", "newAlternativeMethod"],
};

export const refineStep = onCall<{ moduleId: string; stepIndex: number }, Promise<{ suggestion: any }>>(
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
    const { moduleId, stepIndex } = request.data;
    const moduleDoc = await db.collection("modules").doc(moduleId).get();
    const step = moduleDoc.data()?.steps?.[stepIndex];
    if (!step) throw new HttpsError("not-found", "Step not found.");
    const logsSnapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).where("step_index", "==", stepIndex).get();
    const questions = [...new Set(logsSnapshot.docs.map((doc) => doc.data().user_question).filter(Boolean))];
    if (questions.length === 0) return { suggestion: null };

    const prompt = `
      You are an expert instructional designer. A trainee is confused by a step in a manual.
      **Current Step Title:** "${step.title}"
      **Current Step Description:** "${step.description}"
      **Trainee Questions Indicating Confusion:**\n- ${questions.join("\n- ")}
      **Your Task:**
      1.  Rewrite the 'description' to be much clearer and to proactively answer the trainee's questions.
      2.  If the confusion suggests a fundamentally different way to perform the step, create a new 'alternativeMethod'.
      3.  Return the result as a JSON object adhering to the provided schema.
      `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: refinementSchema,
      },
    });

    if (!response.text) {
      throw new HttpsError("internal", "AI returned an empty response.");
    }

    try {
      const parsedSuggestion = JSON.parse(response.text.trim());
      return { suggestion: parsedSuggestion };
    } catch (e) {
      console.error("Failed to parse AI JSON for refineStep:", response.text);
      throw new HttpsError("internal", "AI returned invalid JSON.");
    }
  },
);

export const flagQuestion = onCall<any, Promise<{ status: string; issueId: string }>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be logged in to flag a question.");
    }
    const data = request.data;
    if (!data.module_id || !data.user_question) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const ref = db.collection("flagged_questions").doc();
    await ref.set({
      ...data,
      user_id: uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { status: "ok", issueId: ref.id };
  },
);

export const getFlaggedQuestions = onCall<{ moduleId: string }, Promise<any[]>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { moduleId } = request.data;
    if (!moduleId) {
      throw new HttpsError("invalid-argument", "A module ID must be provided.");
    }

    const moduleDoc = await db.collection("modules").doc(moduleId).get();
    if (!moduleDoc.exists || moduleDoc.data()?.user_id !== uid) {
      throw new HttpsError("permission-denied", "You do not have permission to view flagged questions for this module.");
    }

    const snapshot = await db.collection("flagged_questions")
      .where("module_id", "==", moduleId)
      .orderBy("created_at", "desc")
      .get();

    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  }
);

export const getCheckpointFailureStats = onCall(async (request) => {
  const { moduleId } = request.data;
  const snapshot = await db.collection("checkpointResponses")
    .where("module_id", "==", moduleId)
    .where("answer", "==", "No")
    .get();

  const stats: Record<string, { step_index: number, checkpoint_text: string, count: number }> = {};
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const key = `${data.step_index}:${data.checkpoint_text}`;
    if (!stats[key]) {
      stats[key] = { step_index: data.step_index, checkpoint_text: data.checkpoint_text, count: 0 };
    }
    stats[key].count++;
  });
  return Object.values(stats).sort((a, b) => b.count - a.count);
});

// export const sendCheckpointFailuresToSlack = onCall(async (request) => {
//     const {moduleId, moduleTitle} = request.data;
//     const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
//     if (!SLACK_WEBHOOK_URL) {
//         throw new HttpsError("failed-precondition", "Slack webhook URL is not configured.");
//     }
//     // Logic to fetch stats (re-use or call getCheckpointFailureStats) and format a message
//     // ...
//     // Then send to Slack
//     // await fetch(SLACK_WEBHOOK_URL, {method: 'POST', body: JSON.stringify({text: "Your message"})});
//     return {success: true};
// });

export const getQuestionFrequency = onCall(async (request) => {
  const { moduleId } = request.data;
  const snapshot = await db.collection("tutorLogs").where("module_id", "==", moduleId).get();
  const stats: Record<string, { question: string, stepIndex: number, count: number }> = {};
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const key = data.user_question.toLowerCase().trim();
    if (!stats[key]) {
      stats[key] = { question: data.user_question, stepIndex: data.step_index, count: 0 };
    }
    stats[key].count++;
  });
  return Object.values(stats).sort((a, b) => b.count - a.count);
});
