// src/services/authService.ts

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from '@/firebase';

export type User = firebase.User;
export type AuthError = firebase.auth.Error;
export type AuthResponse = { user: User | null; error: AuthError | null };
export interface SignUpWithPasswordCredentials { email: string; password: string; }

/**
 * Sign up a new user with email & password.
 */
export async function signUp(
    { email, password }: SignUpWithPasswordCredentials
): Promise<AuthResponse> {
    if (!password) {
        return { user: null, error: { name: 'AuthError', code: 'auth/missing-password', message: 'Password is required for sign up.' } };
    }
    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        return { user: userCred.user, error: null };
    } catch (err) {
        return { user: null, error: err as AuthError };
    }
}

/**
 * Sign in an existing user.
 */
export async function signInWithPassword(
    { email, password }: SignUpWithPasswordCredentials,
    stayLoggedIn: boolean = false
): Promise<AuthResponse> {
    if (!password) {
        return { user: null, error: { name: 'AuthError', code: 'auth/missing-password', message: 'Password is required for sign in.' } };
    }
    try {
        const persistence = stayLoggedIn ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
        await auth.setPersistence(persistence);
        const userCred = await auth.signInWithEmailAndPassword(email, password);
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
        await auth.signOut();
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
    return auth.onAuthStateChanged(callback);
}

/**
 * Send a password reset email to the given address.
 */
export async function resetPasswordEmail(
    email: string
): Promise<{ error: AuthError | null }> {
    try {
        await auth.sendPasswordResetEmail(email, { url: `${window.location.origin}/update-password` });
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
        return { error: { name: 'AuthError', code: 'auth/no-current-user', message: 'User not authenticated.' } };
    }
    try {
        await user.updatePassword(newPassword);
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}