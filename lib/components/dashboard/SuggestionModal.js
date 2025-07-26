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
exports.SuggestionModal = void 0;
const react_1 = __importStar(require("react"));
const Icons_1 = require("@/components/Icons");
const SuggestionModal = ({ isOpen, onClose, currentStep, suggestion, onApply, }) => {
    (0, react_1.useEffect)(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-up" onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
        <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Icons_1.LightbulbIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400"/>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Review AI Suggestion</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <Icons_1.XIcon className="h-5 w-5"/>
          </button>
        </header>

        <main className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">For Step:</h3>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{currentStep.title}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Version */}
            <div>
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Current Version</h4>
              <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 h-full">
                <p className="text-sm text-slate-600 dark:text-slate-300">{currentStep.description}</p>
              </div>
            </div>

            {/* Suggested Version */}
            <div>
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">Suggested Improvement</h4>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700 h-full">
                <p className="text-sm text-green-800 dark:text-green-200">{suggestion.newDescription}</p>
              </div>
            </div>
          </div>

          {suggestion.newAlternativeMethod && (<div>
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">Suggested New Alternative Method</h4>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <h5 className="font-bold text-sm text-green-800 dark:text-green-300">{suggestion.newAlternativeMethod.title}</h5>
                <p className="text-sm text-green-700 dark:text-green-200 mt-1">{suggestion.newAlternativeMethod.description}</p>
              </div>
            </div>)}

        </main>

        <footer className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-end items-center gap-4 rounded-b-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left flex-1">
            Applying this fix will also draft a new remedial module for this step.
          </p>
          <div className="flex gap-4">
            <button onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={onApply} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
              <Icons_1.CheckCircleIcon className="h-5 w-5"/>
              Apply & Edit
            </button>
          </div>
        </footer>
      </div>
    </div>);
};
exports.SuggestionModal = SuggestionModal;
