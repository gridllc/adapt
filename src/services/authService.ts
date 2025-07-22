import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import type { User, AuthError, UserCredential, Unsubscribe, NextOrObserver } from 'firebase/auth';
import { auth } from '@/firebase';

export type { User };

// Re-create a similar response structure for compatibility
export type AuthResponse = {
    data: { user: User | null };
    error: AuthError | null;
};

export type SignUpWithPasswordCredentials = {
    email: string;
    password?: string;
};

// --- Sign Up ---
export const signUp = async (credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> => {
    try {
        if (!credentials.password) throw new Error("Password is required for sign up.");
        const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
        return { data: { user: userCredential.user }, error: null };
    } catch (error) {
        return { data: { user: null }, error: error as AuthError };
    }
};

// --- Sign In ---
export const signInWithPassword = async (credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> => {
    try {
        if (!credentials.password) throw new Error("Password is required for sign in.");
        const userCredential: UserCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        return { data: { user: userCredential.user }, error: null };
    } catch (error) {
        return { data: { user: null }, error: error as AuthError };
    }
};

// --- Sign Out ---
export const signOut = async (): Promise<{ error: Error | null }> => {
    try {
        await firebaseSignOut(auth);
        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
};

// --- Get Current User ---
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

// --- Listen for Auth State Changes ---
export const onAuthStateChange = (callback: NextOrObserver<User>): Unsubscribe => {
    return onAuthStateChanged(auth, callback);
};

// --- Password Reset Flow ---
export const sendPasswordResetEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
        await firebaseSendPasswordResetEmail(auth, email, {
            url: `${window.location.origin}/update-password`
        });
        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
};

export const updateUserPassword = async (password: string): Promise<{ error: Error | null }> => {
    if (!auth.currentUser) {
        return { error: new Error("User not authenticated.") };
    }
    try {
        await firebaseUpdatePassword(auth.currentUser, password);
        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
};