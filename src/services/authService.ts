// src/services/authService.ts
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut as firebaseSignOut, updatePassword, onAuthStateChanged, User, AuthError } from 'firebase/auth';
import { firebaseApp } from '@/firebase';

const auth = getAuth(firebaseApp);

export type { User, AuthError };
export type AuthResponse = { user: User | null; error: AuthError | null };
export interface Credentials { email: string; password: string; }

export async function signUp({ email, password }: Credentials): Promise<AuthResponse> {
    if (!password) {
        const error: AuthError = { name: 'FirebaseError', code: 'auth/missing-password', message: 'Password is required for sign up.' } as AuthError;
        return { user: null, error };
    }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCred.user, error: null };
    } catch (err) {
        return { user: null, error: err as AuthError };
    }
}

export async function signIn(email: string, password: string, stayLoggedIn: boolean = false): Promise<AuthResponse> {
    if (!password) {
        const error: AuthError = { name: 'FirebaseError', code: 'auth/missing-password', message: 'Password is required for sign in.' } as AuthError;
        return { user: null, error };
    }
    try {
        const persistence = stayLoggedIn ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCred.user, error: null };
    } catch (err) {
        return { user: null, error: err as AuthError };
    }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
    try {
        await firebaseSignOut(auth);
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}

export function getCurrentUser(): User | null {
    return auth.currentUser;
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
    const unsubscribe = onAuthStateChanged(auth, callback);
    return unsubscribe;
}

export async function resetPasswordEmail(email: string): Promise<{ error: AuthError | null }> {
    try {
        await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/update-password` });
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}

export async function updateUserPassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const user = auth.currentUser;
    if (!user) {
        const error: AuthError = { name: 'FirebaseError', code: 'auth/no-current-user', message: 'User not authenticated.' } as AuthError;
        return { error };
    }
    try {
        await updatePassword(user, newPassword);
        return { error: null };
    } catch (err) {
        return { error: err as AuthError };
    }
}