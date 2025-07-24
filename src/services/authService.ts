// src/services/authService.ts

import {
    getAuth,
    type User,
    type Auth,
    type AuthError,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { firebaseApp } from '@/firebase';

const auth: Auth = getAuth(firebaseApp);

export type { User };
export type AuthResponse = { user: User | null; error: AuthError | null };
export interface SignUpWithPasswordCredentials { email: string; password: string; }

/**
 * Sign up a new user with email & password.
 */
export async function signUp(
    { email, password }: SignUpWithPasswordCredentials
): Promise<AuthResponse> {
    if (!password) {
        return { user: null, error: new Error('Password is required for sign up.') as AuthError };
    }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCred.user, error: null };
    } catch (err) {
        return { user: null, error: err as AuthError };
    }
}

/**
 * Sign in an existing user.
 */
export async function signInWithPassword(
    { email, password }: SignUpWithPasswordCredentials
): Promise<AuthResponse> {
    if (!password) {
        return { user: null, error: new Error('Password is required for sign in.') as AuthError };
    }
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCred.user, error: null };
    } catch (err) {
        return { user: null, error: err as AuthError };
    }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
    try {
        await firebaseSignOut(auth);
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}

/**
 * Get the currently signed-in user, or null.
 */
export function getCurrentUser(): User | null {
    return auth.currentUser;
}

/**
 * Subscribe to authentication state changes.
 */
export function onAuthStateChange(
    callback: (user: User | null) => void
): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Send a password reset email to the given address.
 */
export async function resetPasswordEmail(
    email: string
): Promise<{ error: AuthError | null }> {
    try {
        await firebaseSendPasswordResetEmail(auth, email, { url: `${window.location.origin}/update-password` });
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}

/**
 * Update the current user's password.
 */
export async function updateUserPassword(
    newPassword: string
): Promise<{ error: AuthError | null }> {
    const user = auth.currentUser;
    if (!user) {
        return { error: new Error('User not authenticated.') as AuthError };
    }
    try {
        await firebaseUpdatePassword(user, newPassword);
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}