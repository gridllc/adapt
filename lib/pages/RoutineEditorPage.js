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
const firebase_1 = require("@/firebase");
const firestore_1 = require("firebase/firestore");
const routineService_1 = require("@/services/routineService");
const useAuth_1 = require("@/hooks/useAuth");
const useToast_1 = require("@/hooks/useToast");
const Icons_1 = require("@/components/Icons");
const RoutineEditorPage = () => {
    const { routineId, slug } = (0, react_router_dom_1.useParams)();
    const [searchParams] = (0, react_router_dom_1.useSearchParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { user } = (0, useAuth_1.useAuth)();
    const { addToast } = (0, useToast_1.useToast)();
    const [routine, setRoutine] = (0, react_1.useState)({
        templateId: searchParams.get('templateId') || slug || '',
        intent: '',
        steps: [''],
        videoUrl: null,
    });
    const [videoFile, setVideoFile] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const fetchRoutine = async () => {
            const idToFetch = routineId || slug;
            if (idToFetch) {
                const docRef = (0, firestore_1.doc)(firebase_1.db, "routines", idToFetch);
                const docSnap = await (0, firestore_1.getDoc)(docRef);
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
            await (0, routineService_1.saveRoutine)(routineToSave, videoFile);
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
        return <p className="text-center p-8">Loading routine editor...</p>;
    return (<div className="max-w-3xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">{routineId || slug ? 'Edit Routine' : 'Create New Routine'}</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Core Details Card */}
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Core Details</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Module / Template ID</label>
                            <input type="text" value={routine.templateId} onChange={e => handleInputChange('templateId', e.target.value)} required className={inputStyles} placeholder="e.g., samsung-one-remote"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">User Intent</label>
                            <input type="text" value={routine.intent} onChange={e => handleInputChange('intent', e.target.value)} required className={inputStyles} placeholder="e.g., watch-channel"/>
                        </div>
                    </div>
                </div>

                {/* Steps Card */}
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Steps</h3>
                    <div className="space-y-3">
                        {(routine.steps || []).map((step, index) => (<div key={index} className="flex items-center gap-2">
                                <span className="text-slate-500 font-semibold">{index + 1}.</span>
                                <input type="text" value={step} onChange={e => handleStepChange(index, e.target.value)} className={`flex-grow ${inputStyles}`} placeholder={`Describe step ${index + 1}`}/>
                                <button type="button" onClick={() => removeStep(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"><Icons_1.XIcon className="h-5 w-5"/></button>
                            </div>))}
                    </div>
                    <button type="button" onClick={addStep} className="mt-4 text-sm text-indigo-600 font-semibold hover:underline">+ Add Step</button>
                </div>

                {/* Video Card */}
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Optional Video</h3>
                    <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900"/>
                    {routine.videoUrl && !videoFile && <p className="text-xs mt-2 text-slate-500">Current video: <a href={routine.videoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500">{routine.videoUrl.split('/').pop()}</a></p>}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => navigate('/dashboard/routines')} className="bg-slate-200 dark:bg-slate-600 font-semibold py-2 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors">{isSaving ? 'Saving...' : 'Save Routine'}</button>
                </div>
            </form>
        </div>);
};
exports.default = RoutineEditorPage;
