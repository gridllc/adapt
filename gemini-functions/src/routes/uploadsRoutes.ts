// gemini-functions/src/routes/uploads.ts
import * as express from "express";
import { Response } from "express";
import { storage } from "../firebase";
import { authed, AuthedRequest } from "../middleware/authed";

const router = express.Router();
const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET || "adapt-frontend-rkdt.appspot.com";

router.post("/signed-url", authed, async (req: AuthedRequest, res: Response) => {
    const uid = req.auth.uid;
    const { type, id, contentType, fileExtension } = req.body; // type: 'module' | 'routine' | 'manual'
    let filePath;
    switch (type) {
        case "module":
            filePath = `videos/${uid}/${id}.${fileExtension}`;
            break;
        case "routine":
            filePath = `routines/${uid}/${id}.${fileExtension}`;
            break;
        case "manual":
            filePath = `manuals_for_processing/${uid}/${Date.now()}_${id}`;
            break;
        default:
            return res.status(400).json({ error: "Invalid upload type." });
    }
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({ version: "v4", action: "write", expires: Date.now() + 15 * 60 * 1000, contentType });
    return res.status(200).json({ uploadUrl: url, filePath });
});

router.post("/signed-download-url", authed, async (req: AuthedRequest, res: Response) => {
    const { filePath } = req.body;
    if (!filePath) {
        return res.status(400).json({ error: "A file path is required." });
    }
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    const [url] = await file.getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 60 * 60 * 1000 });
    return res.status(200).json({ downloadUrl: url });
});

export default router;