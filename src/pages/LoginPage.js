import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BookOpenIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
const LoginPage = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [stayLoggedIn, setStayLoggedIn] = useState(true); // Default to true
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { signIn, signUp, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    // Get persisted preference on mount
    useEffect(() => {
        const saved = localStorage.getItem('stayLoggedIn');
        if (saved !== null) {
            setStayLoggedIn(saved === 'true');
        }
    }, []);
    // Persist preference on change
    useEffect(() => {
        localStorage.setItem('stayLoggedIn', String(stayLoggedIn));
    }, [stayLoggedIn]);
    // Redirect if user is already logged in
    useEffect(() => {
        if (isAuthenticated && !isAuthLoading) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate, from]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const { error } = isLoginView
                ? await signIn(email, password, stayLoggedIn)
                : await signUp({ email, password });
            if (error) {
                setError(error.message);
            }
            else {
                navigate(from, { replace: true });
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred.";
            setError(message);
        }
        finally {
            setIsLoading(false);
        }
    };
    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError(null);
        setEmail('');
        setPassword('');
    };
    return (_jsx("div", { className: "flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-900", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("button", { onClick: () => navigate('/'), className: "absolute top-8 left-8 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2", children: [_jsx(BookOpenIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Back to Home" })] }), _jsxs("div", { className: "bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-slate-900 dark:text-white", children: isLoginView ? 'Admin Sign In' : 'Admin Sign Up' }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 mt-2", children: isLoginView ? 'Enter your credentials to sign in.' : 'Create an account to get started.' })] }), error && (_jsx("div", { className: "bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6", role: "alert", children: _jsx("span", { className: "block sm:inline", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "sr-only", children: "Email" }), _jsx("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white", placeholder: "admin@example.com" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { id: "password", name: "password", type: showPassword ? 'text' : 'password', autoComplete: "current-password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400", "aria-label": showPassword ? 'Hide password' : 'Show password', children: showPassword ? _jsx(EyeOffIcon, { className: "h-5 w-5" }) : _jsx(EyeIcon, { className: "h-5 w-5" }) })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "stayLoggedIn", name: "stayLoggedIn", type: "checkbox", checked: stayLoggedIn, onChange: (e) => setStayLoggedIn(e.target.checked), className: "h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500" }), _jsx("label", { htmlFor: "stayLoggedIn", className: "ml-2 block text-sm text-slate-600 dark:text-slate-300", children: "Stay logged in" })] }), _jsx("div", { className: "text-sm", children: _jsx(Link, { to: "/reset-password", className: "font-medium text-indigo-600 dark:text-indigo-400 hover:underline", children: "Forgot Password?" }) })] }), _jsx("button", { type: "submit", className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:scale-100 disabled:cursor-not-allowed", disabled: isLoading || !email.trim() || !password.trim(), children: isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Sign Up') })] }), _jsx("div", { className: "mt-6 text-center", children: _jsx("button", { onClick: toggleView, className: "text-sm text-indigo-600 dark:text-indigo-400 hover:underline", children: isLoginView ? "Don’t have an account? Sign Up" : 'Already have an account? Sign In' }) })] })] }) }));
};
export default LoginPage;
//# sourceMappingURL=LoginPage.js.map