import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { BookOpenIcon } from '@/components/Icons';
const NotFoundPage = () => {
    const location = useLocation();
    return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-screen text-center p-6", children: [_jsx("h1", { className: "text-6xl font-bold text-indigo-500 dark:text-indigo-400", children: " 404 " }), _jsx("h2", { className: "text-3xl font-semibold text-slate-900 dark:text-white mt-4", children: " Page Not Found " }), _jsxs("p", { className: "text-slate-500 dark:text-slate-400 mt-2 max-w-lg break-words", children: ["Sorry, the page you were looking for does not exist at the path: ", _jsxs("code", { className: "bg-slate-100 dark:bg-slate-700 p-1 rounded-md text-red-500", children: [" ", location.pathname, " "] }), "."] }), _jsxs(Link, { to: "/", className: "mt-8 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105", children: [_jsx(BookOpenIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Return to Home " })] })] }));
};
export default NotFoundPage;
//# sourceMappingURL=NotFoundPage.js.map