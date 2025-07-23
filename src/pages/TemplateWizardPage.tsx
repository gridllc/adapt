import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { saveModule } from '@/services/moduleService';
import type { ProcessStep, AppModule, ModuleForInsert, Json } from '@/types';
import { SparklesIcon, ArrowLeftIcon } from '@/components/Icons';

interface Template {
    id: string;
    title: string;
    multi_remote_prompt?: string;
    ai_context_notes?: string;
    buttons?: any[];
    steps: {
        remoteType?: 'A' | 'B';
        title: string;
        description: string;
    }[];
}

const TemplateWizardPage: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const { user } = useAuth();

    const [template, setTemplate] = useState<Template | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wizardStep, setWizardStep] = useState(0);
    const [multiRemoteAnswer, setMultiRemoteAnswer] = useState<boolean | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!templateId) {
                setError("No template ID provided.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`/templates/${templateId}.json`);
                if (!response.ok) throw new Error("Template not found.");
                const data = await response.json();
                setTemplate(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load template.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId]);

    const handleCreateModule = async () => {
        if (!template || !user) return;
        setIsSaving(true);
        addToast('info', 'Generating Module...', 'Your new training module is being created.');

        try {
            let finalSteps = template.steps;
            if (template.multi_remote_prompt && multiRemoteAnswer === false) {
                finalSteps = finalSteps.filter(step => step.remoteType !== 'B');
            }

            const moduleSteps: ProcessStep[] = finalSteps.map(s => ({
                ...s,
                start: 0,
                end: 0,
                checkpoint: null,
                alternativeMethods: [],
            }));

            const moduleToSave: ModuleForInsert = {
                slug: template.id + '-' + Date.now(), // Ensure unique slug
                title: template.title,
                steps: moduleSteps as unknown as Json,
                transcript: [],
                metadata: {
                    is_ai_generated: true,
                    templateId: template.id,
                    templateContext: {
                        ai_context_notes: template.ai_context_notes,
                        buttons: template.buttons,
                    }
                } as Json,
                user_id: user.uid,
            };

            const savedModule = await saveModule({ moduleData: moduleToSave });
            await queryClient.invalidateQueries({ queryKey: ['modules'] });
            addToast('success', 'Module Created!', `Navigating to "${savedModule.title}"...`);
            navigate(`/modules/${savedModule.slug}`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            addToast('error', 'Creation Failed', errorMessage);
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading template...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    if (!template) {
        return <div className="text-center p-8">Template data is unavailable.</div>;
    }

    const renderMultiRemoteStep = () => (
        <div>
            <p className="text-lg text-slate-800 dark:text-slate-200 mb-6">{template.multi_remote_prompt}</p>
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => { setMultiRemoteAnswer(true); setWizardStep(1); }}
                    className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Yes, two remotes
                </button>
                <button
                    onClick={() => { setMultiRemoteAnswer(false); setWizardStep(1); }}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                    One remote only
                </button>
            </div>
        </div>
    );
    
    useEffect(() => {
        // If there are no wizard steps, proceed directly to creation
        if (template && wizardStep === 0 && !template.multi_remote_prompt) {
            handleCreateModule();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template, wizardStep]);


    return (
        <div className="w-full max-w-screen-md mx-auto px-4 py-8">
            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-200 dark:border-slate-700 text-center">
                <button onClick={() => navigate('/')} className="absolute top-12 left-12 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Back to Templates</span>
                </button>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create from Template</h1>
                <p className="text-xl font-semibold text-indigo-500 dark:text-indigo-400 mb-8">{template.title}</p>

                {wizardStep === 0 && template.multi_remote_prompt && renderMultiRemoteStep()}
                
                {wizardStep === 1 && (
                    <div className="animate-fade-in-up">
                        <SparklesIcon className="h-12 w-12 mx-auto text-indigo-500 dark:text-indigo-400 animate-pulse mb-4" />
                        <h2 className="text-xl text-slate-800 dark:text-slate-200">Ready to create your module!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Click the button below to generate the training steps.</p>
                         <button
                            onClick={handleCreateModule}
                            disabled={isSaving}
                            className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-green-700 transition-colors transform hover:scale-105 flex items-center justify-center gap-2 mx-auto"
                        >
                            <SparklesIcon className="h-6 w-6" />
                            {isSaving ? 'Creating...' : 'Create Module'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateWizardPage;
