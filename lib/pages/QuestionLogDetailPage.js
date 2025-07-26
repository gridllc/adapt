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
const analyticsService_1 = require("@/services/analyticsService");
const suggestionsService_1 = require("@/services/suggestionsService");
const flaggingService_1 = require("@/services/flaggingService");
const useAuth_1 = require("@/hooks/useAuth");
const useToast_1 = require("@/hooks/useToast");
const Icons_1 = require("@/components/Icons");
const QuestionLogDetailPage = () => {
    const { moduleId = '', stepIndex = '0', encodedQuestion = '' } = (0, react_router_dom_1.useParams)();
    const userQuestion = decodeURIComponent(encodedQuestion);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const { user } = (0, useAuth_1.useAuth)();
    const { addToast } = (0, useToast_1.useToast)();
    const [startDate, setStartDate] = (0, react_1.useState)('');
    const [endDate, setEndDate] = (0, react_1.useState)('');
    const [showFlagFormId, setShowFlagFormId] = (0, react_1.useState)(null);
    const [flagComment, setFlagComment] = (0, react_1.useState)('');
    const [proposedLogIds, setProposedLogIds] = (0, react_1.useState)([]);
    const { data: logs, isLoading, error } = (0, react_query_1.useQuery)({
        queryKey: ['questionLogs', moduleId, stepIndex, userQuestion, startDate, endDate],
        queryFn: () => (0, analyticsService_1.getQuestionLogsByQuestion)({
            moduleId,
            stepIndex: Number(stepIndex),
            question: userQuestion,
            startDate,
            endDate,
        }),
        enabled: !!moduleId && !!userQuestion,
    });
    const { data: flaggedQuestions = [] } = (0, react_query_1.useQuery)({
        queryKey: ['flaggedQuestions', moduleId],
        queryFn: () => (0, flaggingService_1.getFlaggedQuestions)(moduleId),
        enabled: !!moduleId && !!user,
    });
    const flaggedLogIds = (0, react_1.useMemo)(() => {
        return new Set(flaggedQuestions.map((f) => f.tutorLogId).filter(Boolean));
    }, [flaggedQuestions]);
    const { data: aiSuggestion } = (0, react_query_1.useQuery)({
        queryKey: ['latestAiSuggestion', moduleId, stepIndex],
        queryFn: () => (0, suggestionsService_1.getLatestAiSuggestionForStep)(moduleId, Number(stepIndex)),
        enabled: !!moduleId && !!user,
    });
    const flagMutation = (0, react_query_1.useMutation)({
        mutationFn: ({ logId, tutorResponse }) => {
            if (!user)
                throw new Error("User not authenticated");
            return (0, flaggingService_1.flagQuestion)({
                module_id: moduleId,
                step_index: Number(stepIndex),
                user_question: userQuestion,
                comment: flagComment,
                user_id: user.uid,
                tutor_log_id: logId,
                tutor_response: tutorResponse,
            });
        },
        onSuccess: () => {
            addToast('success', 'Response Flagged', 'The AI response has been marked for review.');
            setFlagComment('');
            setShowFlagFormId(null);
            queryClient.invalidateQueries({ queryKey: ['flaggedQuestions', moduleId] });
        },
        onError: (err) => {
            addToast('error', 'Flagging Failed', err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    });
    const handleProposeFix = (0, react_1.useCallback)((tutorResponse, logId) => {
        navigate(`/modules/${moduleId}/edit`, {
            state: {
                suggestion: tutorResponse,
                stepIndex: Number(stepIndex),
            },
        });
        if (logId) {
            setProposedLogIds(prev => [...prev, logId]);
        }
        addToast('info', 'Navigating to Editor', `The AI's response has been pre-filled in the editor for Step ${Number(stepIndex) + 1}.`);
    }, [navigate, moduleId, stepIndex, addToast]);
    return (<div className="w-full max-w-screen-md mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-8 flex items-center gap-3 justify-center">
                <Icons_1.HelpCircleIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400"/>
                Question Log
            </h1>

            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">History for question:</h2>
                    <p className="text-lg italic text-indigo-600 dark:text-indigo-300">&quot;{userQuestion}&quot;</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Asked in Step {Number(stepIndex) + 1}</p>
                </div>
                
                {aiSuggestion && (<div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 animate-fade-in-up mb-6">
                        <h4 className="flex items-center gap-2 font-bold text-yellow-800 dark:text-yellow-300 mb-2">
                            <Icons_1.SparklesIcon className="h-5 w-5"/>
                            AI-Suggested Fix for this Step
                        </h4>
                        <p className="text-yellow-800 dark:text-yellow-200 italic mb-2">&quot;{aiSuggestion.suggestion}&quot;</p>
                        <button onClick={() => handleProposeFix(aiSuggestion.suggestion)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5">
                            <Icons_1.CheckCircleIcon className="h-4 w-4"/> Apply This Fix in Editor
                        </button>
                        {aiSuggestion.sourceQuestions && aiSuggestion.sourceQuestions.length > 0 && (<div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-600/50">
                                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">This suggestion was generated based on questions like:</p>
                                <ul className="mt-1 space-y-1">
                                    {aiSuggestion.sourceQuestions.slice(0, 2).map((q, i) => (<li key={i} className="text-xs italic text-yellow-800 dark:text-yellow-200 truncate">&quot;{q}&quot;</li>))}
                                </ul>
                            </div>)}
                    </div>)}

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-4 items-center p-4 bg-slate-200 dark:bg-slate-900/50 rounded-lg">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Start Date:
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="ml-2 p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600"/>
                    </label>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        End Date:
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="ml-2 p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600"/>
                    </label>
                </div>

                {isLoading && <p>Loading logs...</p>}
                {error && <p className="text-red-500">Error fetching logs: {error.message}</p>}
                
                {!isLoading && logs?.length === 0 && (<p className="text-center text-slate-500 dark:text-slate-400 py-6">No logs found for this question in the selected date range.</p>)}
                
                {logs && logs.length > 0 && (<ul className="space-y-4">
                        {logs.map((log) => {
                const isFlagged = flaggedLogIds.has(log.id);
                return (<li key={log.id} className="p-4 bg-white dark:bg-slate-800/50 rounded-lg text-sm text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                                <div className="font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                    Asked on: {new Date(log.created_at).toLocaleString()}
                                </div>
                                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">AI Tutor&apos;s Response:</h3>
                                    <pre className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans">{log.tutor_response}</pre>
                                </div>
                                <div className="mt-3 flex gap-4 items-center flex-wrap">
                                    <button onClick={() => !isFlagged && setShowFlagFormId(showFlagFormId === log.id ? null : log.id)} disabled={isFlagged} className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed">
                                        {isFlagged ? (<><Icons_1.CheckCircleIcon className="h-4 w-4 text-green-500"/> Flagged</>) : (<><Icons_1.AlertTriangleIcon className="h-4 w-4"/> Flag for Review</>)}
                                    </button>
                                     <button onClick={() => handleProposeFix(log.tutor_response, log.id)} disabled={proposedLogIds.includes(log.id)} className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed">
                                        {proposedLogIds.includes(log.id) ? (<><Icons_1.CheckCircleIcon className="h-4 w-4"/> Proposed</>) : (<><Icons_1.SparklesIcon className="h-4 w-4"/> Propose Fix from This</>)}
                                    </button>
                                </div>
                                {showFlagFormId === log.id && (<div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 animate-fade-in-up">
                                        <textarea placeholder="Why is this response unhelpful? (Optional)" value={flagComment} onChange={(e) => setFlagComment(e.target.value)} className="w-full text-sm p-2 rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" rows={2}/>
                                        <button className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md text-sm font-semibold flex items-center gap-2" onClick={() => flagMutation.mutate({ logId: log.id, tutorResponse: log.tutor_response })} disabled={flagMutation.isPending}>
                                            {flagMutation.isPending ? 'Submitting...' : <><Icons_1.CheckCircleIcon className="h-4 w-4"/> Submit Flag</>}
                                        </button>
                                    </div>)}
                            </li>);
            })}
                    </ul>)}
            </div>
        </div>);
};
exports.default = QuestionLogDetailPage;
