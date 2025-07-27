import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { resetPasswordEmail } = useAuth();
    const { addToast } = useToast();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await resetPasswordEmail(email);
            if (error) {
                throw error;
            }
            setSubmitted(true);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            addToast('error', 'Request Failed', message);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4", children: _jsxs("div", { className: "max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700", children: [_jsx("h2", { className: "text-2xl font-bold mb-1 text-center text-slate-900 dark:text-white", children: "Reset Your Password" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 text-center mb-6", children: "Enter your email to receive a reset link." }), submitted ? (_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-green-600 dark:text-green-400 text-sm mb-4", children: "Check your email for the reset link." }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Please check your spam folder if you don't see it within a few minutes." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email", required: true, className: "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" }), _jsx("button", { type: "submit", disabled: isLoading || !email.trim(), className: "w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-500", children: isLoading ? 'Sending...' : 'Send Reset Link' })] })), _jsx("p", { className: "mt-4 text-center text-sm text-slate-500 dark:text-slate-400", children: _jsx(Link, { to: "/login", className: "text-indigo-600 dark:text-indigo-400 hover:underline", children: "Back to Sign In" }) })] }) }));
};
export default ForgotPasswordPage;
//# sourceMappingURL=ForgotPasswordPage.js.map