"use strict";
// src/services/authService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPassword = exports.resetPasswordEmail = exports.onAuthStateChange = exports.getCurrentUser = exports.signOut = exports.signInWithPassword = exports.signUp = void 0;
const auth_1 = require("firebase/auth");
const firebase_1 = require("@/firebase");
const auth = (0, auth_1.getAuth)(firebase_1.firebaseApp);
/**
 * Sign up a new user with email & password.
 */
async function signUp({ email, password }) {
    if (!password) {
        return { user: null, error: new Error('Password is required for sign up.') };
    }
    try {
        const userCred = await (0, auth_1.createUserWithEmailAndPassword)(auth, email, password);
        return { user: userCred.user, error: null };
    }
    catch (err) {
        return { user: null, error: err };
    }
}
exports.signUp = signUp;
/**
 * Sign in an existing user.
 */
async function signInWithPassword({ email, password }) {
    if (!password) {
        return { user: null, error: new Error('Password is required for sign in.') };
    }
    try {
        const userCred = await (0, auth_1.signInWithEmailAndPassword)(auth, email, password);
        return { user: userCred.user, error: null };
    }
    catch (err) {
        return { user: null, error: err };
    }
}
exports.signInWithPassword = signInWithPassword;
/**
 * Sign out the current user.
 */
async function signOut() {
    try {
        await (0, auth_1.signOut)(auth);
        return { error: null };
    }
    catch (err) {
        return { error: err };
    }
}
exports.signOut = signOut;
/**
 * Get the currently signed-in user, or null.
 */
function getCurrentUser() {
    return auth.currentUser;
}
exports.getCurrentUser = getCurrentUser;
/**
 * Subscribe to authentication state changes.
 */
function onAuthStateChange(callback) {
    return (0, auth_1.onAuthStateChanged)(auth, callback);
}
exports.onAuthStateChange = onAuthStateChange;
/**
 * Send a password reset email to the given address.
 */
async function resetPasswordEmail(email) {
    try {
        await (0, auth_1.sendPasswordResetEmail)(auth, email, { url: `${window.location.origin}/update-password` });
        return { error: null };
    }
    catch (err) {
        return { error: err };
    }
}
exports.resetPasswordEmail = resetPasswordEmail;
/**
 * Update the current user's password.
 */
async function updateUserPassword(newPassword) {
    const user = auth.currentUser;
    if (!user) {
        return { error: new Error('User not authenticated.') };
    }
    try {
        await (0, auth_1.updatePassword)(user, newPassword);
        return { error: null };
    }
    catch (err) {
        return { error: err };
    }
}
exports.updateUserPassword = updateUserPassword;
