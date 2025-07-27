import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import * as Icons from '@/components/Icons';
export const TemplateCard = ({ id, title, description, icon, category }) => {
    // Dynamically select the icon component, with a fallback
    const IconComponent = Icons[icon] || Icons.BookOpenIcon;
    return (
    // Use Link to navigate to the template wizard page
    _jsxs(Link, { to: `/templates/${id}`, className: "group block w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg hover:shadow-xl hover:ring-2 hover:ring-indigo-500 dark:hover:ring-indigo-400 transition-all duration-300 transform hover:-translate-y-1", title: `Create a module from the "${title}" template`, "data-testid": `template-card-${id}`, children: [_jsxs("div", { className: "flex items-start gap-4 mb-4", children: [_jsx("div", { className: "bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg transition-colors group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800", children: _jsx(IconComponent, { className: "h-6 w-6 text-indigo-600 dark:text-indigo-400" }) }), _jsxs("div", { className: "flex-1 pt-1", children: [_jsx("h2", { className: "text-lg font-bold text-slate-800 dark:text-slate-100", children: title }), _jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400", children: category })] })] }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: description })] }));
};
//# sourceMappingURL=TemplateCard.js.map