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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCard = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const Icons = __importStar(require("@/components/Icons"));
const TemplateCard = ({ id, title, description, icon, category }) => {
    // Dynamically select the icon component, with a fallback
    const IconComponent = Icons[icon] || Icons.BookOpenIcon;
    return (
    // Use Link to navigate to the template wizard page
    <react_router_dom_1.Link to={`/templates/${id}`} className="group block w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg hover:shadow-xl hover:ring-2 hover:ring-indigo-500 dark:hover:ring-indigo-400 transition-all duration-300 transform hover:-translate-y-1" title={`Create a module from the "${title}" template`} data-testid={`template-card-${id}`}>
            <div className="flex items-start gap-4 mb-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg transition-colors group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800">
                    <IconComponent className="h-6 w-6 text-indigo-600 dark:text-indigo-400"/>
                </div>
                <div className="flex-1 pt-1">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{category}</span>
                </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </react_router_dom_1.Link>);
};
exports.TemplateCard = TemplateCard;
