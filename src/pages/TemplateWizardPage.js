import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { saveModule } from '@/services/moduleService';
import { SparklesIcon, ArrowLeftIcon } from '@/components/Icons';
const TemplateWizardPage = () => {
    const { templateId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const { user } = useAuth();
    const [template, setTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wizardStep, setWizardStep] = useState(0);
    const [multiRemoteAnswer, setMultiRemoteAnswer] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
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
    const handleCreateModule = useCallback(async () => {
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
            const savedModule = await saveModule({ moduleData: moduleToSave });
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
    useEffect(() => {
        // If the template is loaded and there are no wizard steps (like a multi-remote prompt),
        // we can proceed directly to module creation.
        if (template && !isLoading && wizardStep === 0 && !template.multi_remote_prompt) {
            handleCreateModule();
        }
    }, [template, isLoading, wizardStep, handleCreateModule]);
    if (isLoading) {
        return _jsx("div", { className: "text-center p-8", children: "Loading template..." });
    }
    if (error) {
        return _jsx("div", { className: "text-center p-8 text-red-500", children: error });
    }
    if (!template) {
        return _jsx("div", { className: "text-center p-8", children: "Template data is unavailable." });
    }
    const renderMultiRemoteStep = () => (_jsxs("div", { children: [_jsx("p", { className: "text-lg text-slate-800 dark:text-slate-200 mb-6", children: template.multi_remote_prompt }), _jsxs("div", { className: "flex justify-center gap-4", children: [_jsx("button", { onClick: () => { setMultiRemoteAnswer(true); setWizardStep(1); }, className: "bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors", children: "Yes, two remotes" }), _jsx("button", { onClick: () => { setMultiRemoteAnswer(false); setWizardStep(1); }, className: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors", children: "One remote only" })] })] }));
    return (_jsx("div", { className: "w-full max-w-screen-md mx-auto px-4 py-8", children: _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-200 dark:border-slate-700 text-center", children: [_jsxs("button", { onClick: () => navigate('/'), className: "absolute top-12 left-12 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2", children: [_jsx(ArrowLeftIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Back to Templates" })] }), _jsx("h1", { className: "text-3xl font-bold text-slate-900 dark:text-white mb-2", children: "Create from Template" }), _jsx("p", { className: "text-xl font-semibold text-indigo-500 dark:text-indigo-400 mb-8", children: template.title }), wizardStep === 0 && template.multi_remote_prompt && renderMultiRemoteStep(), wizardStep === 1 && (_jsxs("div", { className: "animate-fade-in-up", children: [_jsx(SparklesIcon, { className: "h-12 w-12 mx-auto text-indigo-500 dark:text-indigo-400 animate-pulse mb-4" }), _jsx("h2", { className: "text-xl text-slate-800 dark:text-slate-200", children: "Ready to create your module!" }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 mb-6", children: "Click the button below to generate the training steps." }), _jsxs("button", { onClick: handleCreateModule, disabled: isSaving, className: "bg-green-600 text-white font-bold py-3 px-8 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-green-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2 mx-auto", children: [_jsx(SparklesIcon, { className: "h-6 w-6" }), isSaving ? 'Creating...' : 'Create Module'] })] }))] }) }));
};
export default TemplateWizardPage;
//# sourceMappingURL=TemplateWizardPage.js.map