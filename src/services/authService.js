// src/services/authService.ts
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut as firebaseSignOut, updatePassword, onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '@/firebase';
const auth = getAuth(firebaseApp);
export async function signUp({ email, password }) {
    if (!password) {
        const error = { name: 'FirebaseError', code: 'auth/missing-password', message: 'Password is required for sign up.' };
        return { user: null, error };
    }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCred.user, error: null };
    }
    catch (err) {
        return { user: null, error: err };
    }
}
export async function signIn(email, password, stayLoggedIn = false) {
    if (!password) {
        const error = { name: 'FirebaseError', code: 'auth/missing-password', message: 'Password is required for sign in.' };
        return { user: null, error };
    }
    try {
        const persistence = stayLoggedIn ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCred.user, error: null };
    }
    catch (err) {
        return { user: null, error: err };
    }
}
export async function signOut() {
    try {
        await firebaseSignOut(auth);
        return { error: null };
    }
    catch (err) {
        return { error: err };
    }
}
export function getCurrentUser() {
    return auth.currentUser;
}
export function onAuthStateChange(callback) {
    const unsubscribe = onAuthStateChanged(auth, callback);
    return unsubscribe;
}
export async function resetPasswordEmail(email) {
    try {
        await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/update-password` });
        return { error: null };
    }
    catch (err) {
        return { error: err };
    }
}
export async function updateUserPassword(newPassword) {
    const user = auth.currentUser;
    if (!user) {
        const error = { name: 'FirebaseError', code: 'auth/no-current-user', message: 'User not authenticated.' };
        return { error };
    }
    try {
        await updatePassword(user, newPassword);
        return { error: null };
    }
    catch (err) {
        return { error: err };
    }
}
//# sourceMappingURL=authService.js.map