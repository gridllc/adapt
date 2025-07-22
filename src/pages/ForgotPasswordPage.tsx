import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { sendPasswordResetEmail } = useAuth();
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await sendPasswordResetEmail(email);
            if (error) {
                throw error;
            }
            setSubmitted(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            addToast('error', 'Request Failed', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold mb-1 text-center text-slate-900 dark:text-white">Reset Your Password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                    Enter your email to receive a reset link.
                </p>
                {submitted ? (
                    <div className="text-center">
                        <p className="text-green-600 dark:text-green-400 text-sm mb-4">Check your email for the reset link.</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Please check your spam folder if you don't see it within a few minutes.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !email.trim()}
                            className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-500"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
                <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Back to Sign In</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;