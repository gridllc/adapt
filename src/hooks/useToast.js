import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useState, useContext, useCallback } from 'react';
import { Toast as ToastComponent } from '@/components/Toast';
const ToastContext = createContext(undefined);
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((type, title, message, options) => {
        const id = Date.now().toString() + Math.random().toString();
        const newToast = {
            id,
            type,
            title,
            message,
            duration: options?.duration,
            action: options?.action,
        };
        setToasts(prevToasts => [...prevToasts, newToast]);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);
    return (_jsxs(ToastContext.Provider, { value: { addToast }, children: [children, _jsx("div", { className: "fixed top-4 right-4 z-[100] w-full max-w-xs space-y-3", children: toasts.map(toast => (_jsx(ToastComponent, { toast: toast, onDismiss: () => removeToast(toast.id) }, toast.id))) })] }));
};
//# sourceMappingURL=useToast.js.map