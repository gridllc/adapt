import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { EyeIcon, EyeOffIcon } from '@/components/Icons';
const UpdatePasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { updateUserPassword, user } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    useEffect(() => {
        // This page is for users who have just clicked a reset link.
        // A full user object from Firebase might have a `displayName` or other metadata
        // after they've been created, while a password-reset user might not.
        // If they seem like a fully established user, send them away.
        if (user && user.displayName) {
            navigate('/dashboard');
        }
    }, [user, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const { error } = await updateUserPassword(password);
            if (error) {
                throw error;
            }
            setMessage("Your password has been updated successfully! You will be redirected to the login page shortly.");
            addToast('success', 'Password Updated', 'You can now sign in with your new password.');
            setTimeout(() => navigate('/login'), 3000);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(message);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4", children: _jsxs("div", { className: "max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700", children: [_jsx("h2", { className: "text-2xl font-bold mb-1 text-center text-slate-900 dark:text-white", children: "Update Your Password" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 text-center mb-6", children: "Enter and confirm your new password." }), message && _jsx("p", { className: "text-green-600 dark:text-green-400 text-center text-sm mb-4", children: message }), error && _jsx("p", { className: "text-red-600 dark:text-red-400 text-center text-sm mb-4", children: error }), !message && (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), placeholder: "New Password", required: true, className: "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400", children: showPassword ? _jsx(EyeOffIcon, { className: "h-5 w-5" }) : _jsx(EyeIcon, { className: "h-5 w-5" }) })] }), _jsx("input", { type: showPassword ? 'text' : 'password', value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm New Password", required: true, className: "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" }), _jsx("button", { type: "submit", disabled: isLoading || !password || !confirmPassword, className: "w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-500", children: isLoading ? 'Updating...' : 'Update Password' })] }))] }) }));
};
export default UpdatePasswordPage;
//# sourceMappingURL=UpdatePasswordPage.js.map