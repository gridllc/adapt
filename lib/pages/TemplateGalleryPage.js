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
const TemplateCard_1 = require("@/components/TemplateCard");
const react_router_dom_1 = require("react-router-dom");
const Icons_1 = require("@/components/Icons");
const TemplateGalleryPage = () => {
    const [templateData, setTemplateData] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch('/modules/index.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setTemplateData(data.categories);
            }
            catch (err) {
                console.error("Failed to fetch templates:", err);
                setError(err instanceof Error ? err.message : "Failed to load templates.");
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);
    const flatTemplates = (0, react_1.useMemo)(() => {
        if (!templateData)
            return [];
        return templateData.flatMap(category => category.templates.map(template => ({
            ...template,
            category: category.name,
        })));
    }, [templateData]);
    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center p-8 text-slate-500 dark:text-slate-400">Loading templates...</p>;
        }
        if (error) {
            return <p className="text-center p-8 text-red-500">{error}</p>;
        }
        if (flatTemplates.length === 0) {
            return <p className="text-center p-8 text-slate-500 dark:text-slate-400">No templates are available at the moment.</p>;
        }
        return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {flatTemplates.map(template => (<TemplateCard_1.TemplateCard key={template.id} id={template.id} title={template.title} description={template.description} icon={template.icon} category={template.category}/>))}
            </div>);
    };
    return (<div className="max-w-6xl mx-auto px-4 py-12">
            <header className="mb-12 relative text-center">
                <react_router_dom_1.Link to="/" className="absolute top-0 left-0 flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500">
                    <Icons_1.ArrowLeftIcon className="h-4 w-4"/> Back to Home
                </react_router_dom_1.Link>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Training Templates</h1>
                <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Select a template to begin creating a new training module.</p>
            </header>
            {renderContent()}
        </div>);
};
exports.default = TemplateGalleryPage;
