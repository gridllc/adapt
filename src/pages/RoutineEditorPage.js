import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { saveRoutine } from '@/services/routineService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { XIcon } from '@/components/Icons';
const RoutineEditorPage = () => {
    const { routineId, slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();
    const [routine, setRoutine] = useState({
        templateId: searchParams.get('templateId') || slug || '',
        intent: '',
        steps: [''],
        videoUrl: null,
    });
    const [videoFile, setVideoFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        const fetchRoutine = async () => {
            const idToFetch = routineId || slug;
            if (idToFetch) {
                const docRef = doc(db, "routines", idToFetch);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRoutine({ id: docSnap.id, ...docSnap.data() });
                }
                else {
                    addToast('error', 'Not Found', 'Routine or module not found.');
                    navigate('/dashboard/routines');
                }
            }
            setIsLoading(false);
        };
        fetchRoutine();
    }, [routineId, slug, navigate, addToast]);
    const handleInputChange = (field, value) => {
        setRoutine(prev => ({ ...prev, [field]: value }));
    };
    const handleStepChange = (index, value) => {
        const newSteps = [...(routine.steps || [''])];
        newSteps[index] = value;
        setRoutine(prev => ({ ...prev, steps: newSteps }));
    };
    const addStep = () => {
        setRoutine(prev => ({ ...prev, steps: [...(prev.steps || []), ''] }));
    };
    const removeStep = (index) => {
        setRoutine(prev => ({ ...prev, steps: (prev.steps || []).filter((_, i) => i !== index) }));
    };
    const handleSubmit = async (e) => {
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
            };
            await saveRoutine(routineToSave, videoFile);
            addToast('success', 'Routine Saved', 'Your routine has been saved successfully.');
            navigate('/dashboard/routines');
        }
        catch (error) {
            addToast('error', 'Save Failed', error instanceof Error ? error.message : 'An unknown error occurred.');
        }
        finally {
            setIsSaving(false);
        }
    };
    const inputStyles = "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";
    if (isLoading)
        return _jsx("p", { className: "text-center p-8", children: "Loading routine editor..." });
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsx("h2", { className: "text-3xl font-bold mb-6 text-slate-900 dark:text-white", children: routineId || slug ? 'Edit Routine' : 'Create New Routine' }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-8", children: [_jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200", children: "Core Details" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300", children: "Module / Template ID" }), _jsx("input", { type: "text", value: routine.templateId, onChange: e => handleInputChange('templateId', e.target.value), required: true, className: inputStyles, placeholder: "e.g., samsung-one-remote" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300", children: "User Intent" }), _jsx("input", { type: "text", value: routine.intent, onChange: e => handleInputChange('intent', e.target.value), required: true, className: inputStyles, placeholder: "e.g., watch-channel" })] })] })] }), _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200", children: "Steps" }), _jsx("div", { className: "space-y-3", children: (routine.steps || []).map((step, index) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-slate-500 font-semibold", children: [index + 1, "."] }), _jsx("input", { type: "text", value: step, onChange: e => handleStepChange(index, e.target.value), className: `flex-grow ${inputStyles}`, placeholder: `Describe step ${index + 1}` }), _jsx("button", { type: "button", onClick: () => removeStep(index), className: "p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors", children: _jsx(XIcon, { className: "h-5 w-5" }) })] }, index))) }), _jsx("button", { type: "button", onClick: addStep, className: "mt-4 text-sm text-indigo-600 font-semibold hover:underline", children: "+ Add Step" })] }), _jsxs("div", { className: "bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200", children: "Optional Video" }), _jsx("input", { type: "file", accept: "video/*", onChange: e => setVideoFile(e.target.files ? e.target.files[0] : null), className: "w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900" }), routine.videoUrl && !videoFile && _jsxs("p", { className: "text-xs mt-2 text-slate-500", children: ["Current video: ", _jsx("a", { href: routine.videoUrl, target: "_blank", rel: "noopener noreferrer", className: "text-indigo-500", children: routine.videoUrl.split('/').pop() })] })] }), _jsxs("div", { className: "flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700", children: [_jsx("button", { type: "button", onClick: () => navigate('/dashboard/routines'), className: "bg-slate-200 dark:bg-slate-600 font-semibold py-2 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors", children: "Cancel" }), _jsx("button", { type: "submit", disabled: isSaving, className: "bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors", children: isSaving ? 'Saving...' : 'Save Routine' })] })] })] }));
};
export default RoutineEditorPage;
//# sourceMappingURL=RoutineEditorPage.js.map