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
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const useToast_1 = require("@/hooks/useToast");
const useAuth_1 = require("@/hooks/useAuth");
const moduleService_1 = require("@/services/moduleService");
const Icons_1 = require("@/components/Icons");
const TemplateWizardPage = () => {
    const { templateId } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const { addToast } = (0, useToast_1.useToast)();
    const { user } = (0, useAuth_1.useAuth)();
    const [template, setTemplate] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [wizardStep, setWizardStep] = (0, react_1.useState)(0);
    const [multiRemoteAnswer, setMultiRemoteAnswer] = (0, react_1.useState)(null);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const fetchTemplate = async () => {
            if (!templateId) {
                setError("No template ID provided.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`/modules/${templateId}.json`);
                if (!response.ok)
                    throw new Error("Template not found.");
                const data = await response.json();
                setTemplate(data);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load template.");
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId]);
    const handleCreateModule = (0, react_1.useCallback)(async () => {
        if (!template || !user)
            return;
        setIsSaving(true);
        addToast('info', 'Generating Module...', 'Your new training module is being created.');
        try {
            let finalSteps = template.steps;
            if (template.multi_remote_prompt && multiRemoteAnswer === false) {
                finalSteps = finalSteps.filter(step => step.remoteType !== 'B');
            }
            const moduleSteps = finalSteps.map(s => ({
                title: s.title,
                description: s.description,
                remoteType: s.remoteType ?? undefined,
                start: 0,
                end: 0,
                checkpoint: null,
                alternativeMethods: [],
            }));
            const templateContext = {
                templateId: template.id
            };
            if (template.ai_context_notes) {
                templateContext.ai_context_notes = template.ai_context_notes;
            }
            if (template.buttons) {
                templateContext.buttons = template.buttons;
            }
            const moduleToSave = {
                slug: template.id + '-' + Date.now(), // Ensure unique slug
                title: template.title,
                steps: moduleSteps,
                transcript: [],
                video_url: null,
                metadata: {
                    is_ai_generated: true,
                    templateId: template.id,
                    templateContext: templateContext
                },
                user_id: user.uid,
            };
            const savedModule = await (0, moduleService_1.saveModule)({ moduleData: moduleToSave });
            await queryClient.invalidateQueries({ queryKey: ['modules'] });
            addToast('success', 'Module Created!', `Navigating to "${savedModule.title}"...`);
            navigate(`/modules/${savedModule.slug}/edit`);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            addToast('error', 'Creation Failed', errorMessage);
            setIsSaving(false);
        }
    }, [template, user, multiRemoteAnswer, addToast, queryClient, navigate]);
    // This hook is now called unconditionally at the top level of the component.
    // The logic inside the hook remains conditional.
    (0, react_1.useEffect)(() => {
        // If the template is loaded and there are no wizard steps (like a multi-remote prompt),
        // we can proceed directly to module creation.
        if (template && !isLoading && wizardStep === 0 && !template.multi_remote_prompt) {
            handleCreateModule();
        }
    }, [template, isLoading, wizardStep, handleCreateModule]);
    if (isLoading) {
        return <div className="text-center p-8">Loading template...</div>;
    }
    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }
    if (!template) {
        return <div className="text-center p-8">Template data is unavailable.</div>;
    }
    const renderMultiRemoteStep = () => (<div>
            <p className="text-lg text-slate-800 dark:text-slate-200 mb-6">{template.multi_remote_prompt}</p>
            <div className="flex justify-center gap-4">
                <button onClick={() => { setMultiRemoteAnswer(true); setWizardStep(1); }} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors">
                    Yes, two remotes
                </button>
                <button onClick={() => { setMultiRemoteAnswer(false); setWizardStep(1); }} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    One remote only
                </button>
            </div>
        </div>);
    return (<div className="w-full max-w-screen-md mx-auto px-4 py-8">
            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-200 dark:border-slate-700 text-center">
                <button onClick={() => navigate('/')} className="absolute top-12 left-12 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <Icons_1.ArrowLeftIcon className="h-5 w-5"/>
                    <span>Back to Templates</span>
                </button>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create from Template</h1>
                <p className="text-xl font-semibold text-indigo-500 dark:text-indigo-400 mb-8">{template.title}</p>

                {wizardStep === 0 && template.multi_remote_prompt && renderMultiRemoteStep()}

                {wizardStep === 1 && (<div className="animate-fade-in-up">
                        <Icons_1.SparklesIcon className="h-12 w-12 mx-auto text-indigo-500 dark:text-indigo-400 animate-pulse mb-4"/>
                        <h2 className="text-xl text-slate-800 dark:text-slate-200">Ready to create your module!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Click the button below to generate the training steps.</p>
                        <button onClick={handleCreateModule} disabled={isSaving} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-green-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2 mx-auto">
                            <Icons_1.SparklesIcon className="h-6 w-6"/>
                            {isSaving ? 'Creating...' : 'Create Module'}
                        </button>
                    </div>)}
            </div>
        </div>);
};
exports.default = TemplateWizardPage;
