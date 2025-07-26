"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleList = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const Icons_1 = require("@/components/Icons");
const ModuleCardSkeleton_1 = require("@/components/dashboard/ModuleCardSkeleton");
const ModuleList = ({ modules, isLoading, onSelectForDeletion }) => {
    return (<div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Your Training Modules</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {isLoading ? (Array.from({ length: 3 }).map((_, i) => <ModuleCardSkeleton_1.ModuleCardSkeleton key={i}/>)) : modules.length > 0 ? (modules.map(mod => (<div key={mod.slug} className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{mod.title}</h4>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <span>{mod.steps?.length || 0} steps</span>
                                    <span>{mod.session_count || 0} sessions</span>
                                    <span>Last used: {mod.last_used_at ? new Date(mod.last_used_at).toLocaleDateString() : 'Never'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <react_router_dom_1.Link to={`/modules/${mod.slug}`} className="bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm hover:bg-indigo-700">Train</react_router_dom_1.Link>
                                <react_router_dom_1.Link to={`/modules/${mod.slug}/edit`} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold py-1.5 px-3 rounded-md text-sm hover:bg-slate-300 dark:hover:bg-slate-600">Edit</react_router_dom_1.Link>
                                <button onClick={() => onSelectForDeletion(mod)} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold p-2 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-800/50"><Icons_1.TrashIcon className="h-4 w-4"/></button>
                            </div>
                        </div>))) : (<div className="text-center py-8">
                        <p className="text-slate-500 dark:text-slate-400">You haven't created any modules yet.</p>
                        <react_router_dom_1.Link to="/create" className="mt-4 inline-block bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Create Your First Module</react_router_dom_1.Link>
                    </div>)}
            </div>
        </div>);
};
exports.ModuleList = ModuleList;
