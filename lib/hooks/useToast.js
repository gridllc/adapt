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
exports.ToastProvider = exports.useToast = void 0;
const react_1 = __importStar(require("react"));
const Toast_1 = require("@/components/Toast");
const ToastContext = (0, react_1.createContext)(undefined);
const useToast = () => {
    const context = (0, react_1.useContext)(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
exports.useToast = useToast;
const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const addToast = (0, react_1.useCallback)((type, title, message, options) => {
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
    const removeToast = (0, react_1.useCallback)((id) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);
    return (<ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] w-full max-w-xs space-y-3">
                {toasts.map(toast => (<Toast_1.Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)}/>))}
            </div>
        </ToastContext.Provider>);
};
exports.ToastProvider = ToastProvider;
