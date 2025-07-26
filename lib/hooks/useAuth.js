"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.AuthProvider = void 0;
const react_1 = __importStar(require("react"));
const authService = __importStar(require("@/services/authService"));
const AuthContext = (0, react_1.createContext)(undefined);
const AuthProvider = ({ children, debug = false }) => {
    const [user, setUser] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        // Firebase's onAuthStateChanged returns an unsubscribe function
        const unsubscribe = authService.onAuthStateChange((user) => {
            setUser(user);
            setIsLoading(false);
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);
    // Effect for logging auth state in debug mode
    (0, react_1.useEffect)(() => {
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
        signIn: authService.signInWithPassword,
        login: authService.signInWithPassword, // Add alias to value
        signUp: authService.signUp,
        signOut: authService.signOut,
        resetPasswordEmail: authService.resetPasswordEmail,
        updateUserPassword: authService.updateUserPassword,
    };
    return react_1.default.createElement(AuthContext.Provider, { value }, children);
};
exports.AuthProvider = AuthProvider;
const useAuth = () => {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
exports.useAuth = useAuth;
