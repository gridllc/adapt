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
exports.Toast = void 0;
const react_1 = __importStar(require("react"));
const Icons_1 = require("@/components/Icons");
const ICONS = {
    success: <Icons_1.CheckCircleIcon className="h-6 w-6 text-green-500"/>,
    error: <Icons_1.AlertTriangleIcon className="h-6 w-6 text-red-500"/>,
    info: <Icons_1.InfoIcon className="h-6 w-6 text-blue-500"/>,
};
const BG_COLORS = {
    success: 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700',
    error: 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700',
    info: 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700',
};
const Toast = ({ toast, onDismiss }) => {
    (0, react_1.useEffect)(() => {
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
    return (<div className={`max-w-sm w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${BG_COLORS[toast.type]} animate-fade-in-up`} role="alert" aria-live="assertive" aria-atomic="true">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {ICONS[toast.type]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
            {toast.action && (<div className="mt-3">
                <button onClick={handleActionClick} className="bg-indigo-600 text-white text-sm font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-indigo-500">
                  {toast.action.label}
                </button>
              </div>)}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button onClick={() => onDismiss(toast.id)} className="inline-flex rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-indigo-500">
              <span className="sr-only">Close</span>
              <Icons_1.XIcon className="h-5 w-5"/>
            </button>
          </div>
        </div>
      </div>
    </div>);
};
exports.Toast = Toast;
