import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { saveRoutine } from '@/services/routineService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import type { Routine } from '@/types';
import { XIcon, UploadCloudIcon } from '@/components/Icons';

const RoutineEditorPage: React.FC = () => {
    const { routineId } = useParams<{ routineId?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [routine, setRoutine] = useState<Partial<Routine>>({
        templateId: searchParams.get('templateId') || '',
        intent: '',
        steps: [''],
        videoUrl: null,
    });
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchRoutine = async () => {
            if (routineId) {
                const docRef = doc(db, "routines", routineId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRoutine({ id: docSnap.id, ...docSnap.data() } as Routine);
                } else {
                    addToast('error', 'Not Found', 'Routine not found.');
                    navigate('/dashboard/routines');
                }
            }
            setIsLoading(false);
        };
        fetchRoutine();
    }, [routineId, navigate, addToast]);

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...(routine.steps || [''])];
        newSteps[index] = value;
        setRoutine(prev => ({ ...prev, steps: newSteps }));
    };

    const addStep = () => {
        setRoutine(prev => ({ ...prev, steps: [...(prev.steps || []), ''] }));
    };

    const removeStep = (index: number) => {
        setRoutine(prev => ({ ...prev, steps: (prev.steps || []).filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !routine.templateId || !routine.intent || (routine.steps || []).some(s => !s.trim())) {
            addToast('error', 'Missing Fields', 'Please fill in all required fields.');
            return;
        }
        setIsSaving(true);
        try {
            const routineToSave = {
                ...routine,
                userId: user.uid,
                steps: routine.steps?.filter(s => s.trim()) || [],
            } as Omit<Routine, 'id'> & { id?: string };

            await saveRoutine(routineToSave, videoFile);
            addToast('success', 'Routine Saved', 'Your routine has been saved successfully.');
            navigate('/dashboard/routines');
        } catch (error) {
            addToast('error', 'Save Failed', error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <p>Loading routine...</p>;

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">{routineId ? 'Edit Routine' : 'Create New Routine'}</h2>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Module / Template ID</label>
                    <input type="text" value={routine.templateId} onChange={e => setRoutine(p => ({ ...p, templateId: e.target.value }))} required className="w-full input-style" placeholder="e.g., samsung-one-remote" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">User Intent</label>
                    <input type="text" value={routine.intent} onChange={e => setRoutine(p => ({ ...p, intent: e.target.value }))} required className="w-full input-style" placeholder="e.g., watch-channel" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Steps</label>
                    <div className="space-y-2">
                        {(routine.steps || []).map((step, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="text" value={step} onChange={e => handleStepChange(index, e.target.value)} className="flex-grow input-style" placeholder={`Step ${index + 1}`} />
                                <button type="button" onClick={() => removeStep(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><XIcon className="h-5 w-5" /></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addStep} className="mt-2 text-sm text-indigo-600 font-semibold hover:underline">+ Add Step</button>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Optional Video</label>
                    <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {routine.videoUrl && !videoFile && <p className="text-xs mt-1">Current video: <a href={routine.videoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500">{routine.videoUrl.split('/').pop()}</a></p>}
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t dark:border-slate-700">
                    <button type="button" onClick={() => navigate('/dashboard/routines')} className="bg-slate-200 dark:bg-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300">Cancel</button>
                    <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{isSaving ? 'Saving...' : 'Save Routine'}</button>
                </div>
            </form>
        </div>
    );
};

export default RoutineEditorPage;