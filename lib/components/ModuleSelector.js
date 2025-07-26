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
exports.ModuleSelector = void 0;
// src/components/ModuleSelector.tsx
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const ModuleSelector = () => {
    const [templates, setTemplates] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const navigate = (0, react_router_dom_1.useNavigate)();
    (0, react_1.useEffect)(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch('/modules/index.json');
                const data = await response.json();
                // Flatten templates from categories for a simple list
                const allTemplates = data.categories.flatMap((category) => category.templates);
                setTemplates(allTemplates);
            }
            catch (error) {
                console.error("Failed to fetch templates:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);
    const handleSelect = (slug) => {
        // Navigate to the template wizard page, as you cannot "edit" a template directly.
        // The wizard will then create a new module from the template.
        navigate(`/templates/${slug}`);
    };
    if (isLoading)
        return <p className="text-center text-slate-500 dark:text-slate-400">Loading templates...</p>;
    return (<div className="max-w-2xl mx-auto p-4">
            <h2 className="text-xl font-bold mb-4">Choose a Template to Create a Module</h2>
            <div className="grid grid-cols-1 gap-4">
                {templates.map((mod) => (<button key={mod.id} onClick={() => handleSelect(mod.id)} className="p-4 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left shadow-sm transition-colors">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{mod.title}</div>
                        {mod.description && <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{mod.description}</div>}
                    </button>))}
            </div>
        </div>);
};
exports.ModuleSelector = ModuleSelector;
