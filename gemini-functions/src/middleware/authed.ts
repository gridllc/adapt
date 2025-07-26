// gemini-functions/src/middleware/authed.ts
import { Request, Response, NextFunction } from "express";
import { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "../firebase"; // Import the initialized auth instance
import * as logger from "firebase-functions/logger";

/**
 * Extends the Express Request interface to include the decoded Firebase auth token.
 * This provides type safety for authenticated routes.
 */
export interface AuthedRequest extends Request {
    auth: DecodedIdToken;
}

export const authed = async (req: Request, res: Response, next: NextFunction) => {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
        res.status(401).send("Unauthorized: No token provided.");
        return;
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);

        // Add logging for easier debugging in the development environment
        if (process.env.FUNCTIONS_EMULATOR) {
            logger.info("Authenticated UID:", decodedToken.uid);
        }

        (req as AuthedRequest).auth = decodedToken; // Attach decoded token to request object
        next();
    } catch (err) {
        res.status(403).send("Unauthorized: Invalid token.");
    }
};