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
const react_1 = __importStar(require("react"));
const useAuth_1 = require("@/hooks/useAuth");
const react_router_dom_1 = require("react-router-dom");
const useToast_1 = require("@/hooks/useToast");
const Icons_1 = require("@/components/Icons");
const UpdatePasswordPage = () => {
    const [password, setPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [message, setMessage] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { updateUserPassword, user } = (0, useAuth_1.useAuth)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { addToast } = (0, useToast_1.useToast)();
    (0, react_1.useEffect)(() => {
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
    return (<div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold mb-1 text-center text-slate-900 dark:text-white">Update Your Password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                    Enter and confirm your new password.
                </p>
                {message && <p className="text-green-600 dark:text-green-400 text-center text-sm mb-4">{message}</p>}
                {error && <p className="text-red-600 dark:text-red-400 text-center text-sm mb-4">{error}</p>}

                {!message && (<form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" required className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400">
                                {showPassword ? <Icons_1.EyeOffIcon className="h-5 w-5"/> : <Icons_1.EyeIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                        <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" required className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"/>
                        <button type="submit" disabled={isLoading || !password || !confirmPassword} className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-500">
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>)}
            </div>
        </div>);
};
exports.default = UpdatePasswordPage;
