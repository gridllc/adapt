import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import * as authService from '@/services/authService';
import type { User } from '@/services/authService';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    signIn: typeof authService.signIn;
    login: typeof authService.signIn; // Alias for backward compatibility
    signUp: typeof authService.signUp;
    signOut: typeof authService.signOut;
    resetPasswordEmail: typeof authService.resetPasswordEmail;
    updateUserPassword: typeof authService.updateUserPassword;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode, debug?: boolean }> = ({ children, debug = false }) => {
    const [user, setUser] = useState<User | null>(null);
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

    const value: AuthContextType = {
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
