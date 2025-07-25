


export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface AlternativeMethod {
    title: string;
    description: string;
}

export interface TranscriptLine {
    start: number;
    end: number;
    text: string;
}

export interface ProcessStep {
    start: number;
    end: number;
    title: string;
    description: string;
    checkpoint: string | null;
    alternativeMethods: AlternativeMethod[];
    remoteType?: 'A' | 'B' | null;
}

export type TemplateContext = {
    ai_context_notes?: string;
    buttons?: { name: string, symbol: string, function: string }[];
    templateId?: string;
};

// Stricter application-level types for modules
export interface AppModule {
    slug: string;
    title: string;
    steps: ProcessStep[];
    transcript: TranscriptLine[];
    created_at: string;
    metadata: {
        is_ai_generated?: boolean;
        templateId?: string;
        templateContext?: TemplateContext;
        source_model?: string;
        [key: string]: Json | undefined;
    } | null;
    user_id: string | null;
    video_url: string | null;
}

export interface AppModuleWithStats {
    slug: string | null;
    title: string | null;
    steps: ProcessStep[];
    transcript: TranscriptLine[];
    created_at: string | null;
    is_ai_generated?: boolean | null;
    last_used_at?: string | null;
    metadata: Json | null;
    session_count?: number | null;
    user_id: string | null;
    video_url: string | null;
}

// Alias AppModule for use in LiveCoachPage
export type TrainingModule = AppModule;

export interface ModuleForInsert {
    created_at?: string;
    metadata?: Json | null;
    slug: string;
    steps?: Json | null;
    title: string;
    transcript?: Json | null;
    user_id?: string | null;
    video_url?: string | null;
}

export interface CheckpointResponse {
    answer: string;
    checkpoint_text: string;
    comment: string | null;
    created_at: string;
    id: string;
    module_id: string;
    step_index: number;
    user_id: string;
}


export interface VideoMetadata {
    originalName: string;
    size: number;
    duration: number;
    width: number;
    height: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    citations?: { uri: string; title?: string; }[];
    isFallback?: boolean;
    imageUrl?: string; // For generated images
    isLoading?: boolean; // For showing loading indicators on a specific message
    isError?: boolean; // For displaying an inline error message
    feedback?: 'good' | 'bad' | null;
    memoryMatches?: TutorLog[];
    embeddingSource?: string;
    isRoutine?: boolean; // Flag for styling routine-based answers
}

export interface GroundingChunk {
    web?: {
        uri: string;
        title?: string;
    };
}

export type StepStatus = 'done' | 'unclear' | 'skipped';

export interface UserAction {
    stepIndex: number;
    status: StepStatus;
    timestamp: number;
}

export interface VideoAnalysisResult {
    timestamps: { start: number; end: number }[];
    transcript: TranscriptLine[];
}

export interface TraineeSuggestion {
    id: string;
    moduleId: string;
    stepIndex: number;
    text: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface AiSuggestion {
    id: string;
    moduleId: string;
    stepIndex: number;
    originalInstruction: string;
    suggestion: string;
    sourceQuestions: string[];
    createdAt: string;
}

export interface FlaggedQuestion {
    id: string;
    moduleId: string;
    stepIndex: number;
    userQuestion: string;
    comment: string | null;
    userId: string | null;
    createdAt: string;
    tutorLogId: string | null;
    tutorResponse: string | null;
}

// This type mirrors the expected input for the 'flagQuestion' cloud function.
export interface FlaggedQuestionForInsert {
    module_id: string;
    step_index: number;
    user_question: string;
    tutor_response: string | null;
    user_id: string | null;
    comment?: string | null;
    tutor_log_id?: string | null;
}

export interface AnalysisHotspot {
    stepIndex: number;
    stepTitle: string;
    questions: string[];
    questionCount: number;
}

export interface RefinementSuggestion {
    newDescription: string;
    newAlternativeMethod: AlternativeMethod | null;
}

export interface GeneratedBranchModule {
    title: string;
    steps: string[];
}

export interface PerformanceReportData {
    moduleTitle: string;
    completionDate: string;
    aiFeedback: string;
    unclearSteps: ProcessStep[];
    userQuestions: string[];
}

export type CoachEventType = 'hint' | 'correction' | 'tutoring' | 'step_advance' | 'hinting' | 'correcting';

export interface LiveCoachEvent {
    eventType: CoachEventType;
    stepIndex: number;
    timestamp: number;
}

export interface SessionState {
    moduleId: string;
    sessionToken: string;
    currentStepIndex: number;
    userActions: UserAction[];
    isCompleted: boolean;
    liveCoachEvents?: LiveCoachEvent[]; // Optional for backward compatibility with older session data
    score?: number;
}

export interface SessionSummary extends SessionState {
    startedAt: number;
    endedAt: number;
    durationsPerStep: Record<number, number>; // in milliseconds
}

export interface QuestionStats {
    question: string;
    count: number;
    stepIndex: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface AuthUser {
    id: string;
    email?: string;
    app_metadata: {
        provider?: string;
        [key: string]: unknown;
    };
}

export interface CheckpointEvaluation {
    isCorrect: boolean;
    feedback: string;
    suggestedInstructionChange?: string;
}

export interface DetectedObject {
    label: string;
    score?: number; // Confidence score from the model
    box: [number, number, number, number]; // [xMin, yMin, xMax, yMax] as percentages
}

export interface StepNeeds {
    required: string[];
    forbidden: string[];
    branchOn?: { item: string; module: string }[];
}

export type ModuleNeeds = Record<string, Record<number, StepNeeds>>;

export interface TutorLog {
    id: string;
    user_question: string;
    tutor_response: string;
    similarity?: number;
}

export interface TutorLogRow {
    id: string;
    module_id: string;
    step_index: number | null;
    user_question: string;
    tutor_response: string;
    created_at: string | null;
    step_title?: string;
    remote_type?: 'A' | 'B' | 'ai-routine' | null;
}

export interface AIFeedbackLog {
    id: string;
    sessionToken: string;
    moduleId: string;
    stepIndex: number;
    userPrompt: string;
    aiResponse: string;
    feedback: 'good' | 'bad';
    userFixText?: string;
    fixEmbedding?: number[];
    createdAt: string;
}

export interface SimilarFix {
    id: string;
    userFixText: string;
    similarity: number;
}

export interface Routine {
    id: string;
    templateId: string; // The module slug this routine belongs to
    intent: string;
    steps: string[];
    videoUrl?: string | null;
    userId: string;
    createdAt?: string;
    updatedAt?: string;
}