import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from '@/firebase';

// Types are now on the firebase namespace
export type User = firebase.User;
type AuthError = firebase.auth.Error;
type UserCredential = firebase.auth.UserCredential;
type Unsubscribe = firebase.Unsubscribe;
type NextOrObserver<T> = firebase.Observer<T> | ((a: T | null) => void);


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
        const userCredential: UserCredential = await auth.createUserWithEmailAndPassword(credentials.email, credentials.password);
        return { data: { user: userCredential.user }, error: null };
    } catch (error) {
        return { data: { user: null }, error: error as AuthError };
    }
};

// --- Sign In ---
export const signInWithPassword = async (credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> => {
    try {
        if (!credentials.password) throw new Error("Password is required for sign in.");
        const userCredential: UserCredential = await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
        return { data: { user: userCredential.user }, error: null };
    } catch (error) {
        return { data: { user: null }, error: error as AuthError };
    }
};

// --- Sign Out ---
export const signOut = async (): Promise<{ error: Error | null }> => {
    try {
        await auth.signOut();
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
    return auth.onAuthStateChanged(callback as any);
};

// --- Password Reset Flow ---
export const sendPasswordResetEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
        await auth.sendPasswordResetEmail(email, {
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
        await auth.currentUser.updatePassword(password);
        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
};