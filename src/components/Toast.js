import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from '@/components/Icons';
const ICONS = {
    success: _jsx(CheckCircleIcon, { className: "h-6 w-6 text-green-500" }),
    error: _jsx(AlertTriangleIcon, { className: "h-6 w-6 text-red-500" }),
    info: _jsx(InfoIcon, { className: "h-6 w-6 text-blue-500" }),
};
const BG_COLORS = {
    success: 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700',
    error: 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700',
    info: 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700',
};
export const Toast = ({ toast, onDismiss }) => {
    useEffect(() => {
        // Do not auto-dismiss if there's an action for the user to take.
        if (toast.action)
            return;
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration ?? 5000); // Use provided duration or default to 5 seconds
        return () => {
            clearTimeout(timer);
        };
    }, [toast, onDismiss]);
    const handleActionClick = () => {
        if (toast.action) {
            toast.action.onClick();
            onDismiss(toast.id); // Dismiss toast after action is performed
        }
    };
    return (_jsx("div", { className: `max-w-sm w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${BG_COLORS[toast.type]} animate-fade-in-up`, role: "alert", "aria-live": "assertive", "aria-atomic": "true", children: _jsx("div", { className: "p-4", children: _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex-shrink-0", children: ICONS[toast.type] }), _jsxs("div", { className: "ml-3 w-0 flex-1 pt-0.5", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: toast.title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: toast.message }), toast.action && (_jsx("div", { className: "mt-3", children: _jsx("button", { onClick: handleActionClick, className: "bg-indigo-600 text-white text-sm font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-indigo-500", children: toast.action.label }) }))] }), _jsx("div", { className: "ml-4 flex-shrink-0 flex", children: _jsxs("button", { onClick: () => onDismiss(toast.id), className: "inline-flex rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-indigo-500", children: [_jsx("span", { className: "sr-only", children: "Close" }), _jsx(XIcon, { className: "h-5 w-5" })] }) })] }) }) }));
};
//# sourceMappingURL=Toast.js.map