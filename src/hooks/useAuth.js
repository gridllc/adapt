import React, { useState, useEffect, createContext, useContext } from 'react';
import * as authService from '@/services/authService';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children, debug = false }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        // Firebase's onAuthStateChanged returns an unsubscribe function
        const unsubscribe = authService.onAuthStateChange((user) => {
            setUser(user);
            setIsLoading(false);
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);
    // Effect for logging auth state in debug mode
    useEffect(() => {
        if (debug) {
            console.log('[AuthDebug] State changed:', {
                isAuthenticated: !!user,
                user,
                isLoading,
            });
        }
    }, [user, isLoading, debug]);
    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn: authService.signIn,
        login: authService.signIn, // Add alias to value
        signUp: authService.signUp,
        signOut: authService.signOut,
        resetPasswordEmail: authService.resetPasswordEmail,
        updateUserPassword: authService.updateUserPassword,
    };
    return React.createElement(AuthContext.Provider, { value }, children);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
//# sourceMappingURL=useAuth.js.map