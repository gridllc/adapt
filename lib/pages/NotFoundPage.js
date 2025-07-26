"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const Icons_1 = require("@/components/Icons");
const NotFoundPage = () => {
    const location = (0, react_router_dom_1.useLocation)();
    return (<div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h1 className="text-6xl font-bold text-indigo-500 dark:text-indigo-400"> 404 </h1>
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-white mt-4"> Page Not Found </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg break-words">
                    Sorry, the page you were looking for does not exist at the path: <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded-md text-red-500"> {location.pathname} </code>.
                        </p>
                        <react_router_dom_1.Link to="/" className="mt-8 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">
        <Icons_1.BookOpenIcon className="h-5 w-5"/>
            <span>Return to Home </span>
                </react_router_dom_1.Link>
                </div>);
};
exports.default = NotFoundPage;
