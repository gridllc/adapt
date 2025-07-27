import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { LogOutIcon, UserIcon, BarChartIcon, SunIcon, MoonIcon, SearchIcon, XIcon, LightbulbIcon } from '@/components/Icons';
import { TemplateCard } from '@/components/TemplateCard';
// Skeleton loader component for template cards to improve perceived performance
const TemplateCardSkeleton = () => (_jsxs("div", { className: "w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg", children: [_jsxs("div", { className: "flex items-start gap-4 mb-4 animate-pulse", children: [_jsx("div", { className: "bg-slate-200 dark:bg-slate-700 p-3 rounded-lg", children: _jsx("div", { className: "h-6 w-6 bg-slate-300 dark:bg-slate-600 rounded" }) }), _jsxs("div", { className: "flex-1 space-y-2 pt-1", children: [_jsx("div", { className: "h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" }), _jsx("div", { className: "h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" })] })] }), _jsx("div", { className: "w-full h-9 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" })] }));
const HomePage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [templateData, setTemplateData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch('/modules/index.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setTemplateData(data.categories);
            }
            catch (error) {
                console.error("Failed to fetch templates:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);
    const filteredCategories = useMemo(() => {
        if (!templateData)
            return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        if (!lowercasedTerm)
            return templateData;
        return templateData
            .map(category => ({
            ...category,
            templates: category.templates.filter(template => template.title.toLowerCase().includes(lowercasedTerm) ||
                template.description.toLowerCase().includes(lowercasedTerm)),
        }))
            .filter(category => category.templates.length > 0);
    }, [templateData, searchTerm]);
    return (_jsxs("div", { className: "w-full max-w-screen-md mx-auto px-4 py-12", children: [_jsxs("header", { className: "mb-12 relative text-center", children: [_jsxs("div", { className: "absolute top-0 right-0 flex items-center gap-4", children: [_jsx("button", { onClick: toggleTheme, className: "p-2 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700", "aria-label": theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', "data-testid": "theme-toggle-btn", children: theme === 'dark' ? _jsx(SunIcon, { className: "h-5 w-5" }) : _jsx(MoonIcon, { className: "h-5 w-5" }) }), isAuthenticated && user ? (_jsxs(_Fragment, { children: [_jsxs(Link, { to: "/dashboard", className: "flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors", title: "Go to Dashboard", "data-testid": "dashboard-link", children: [_jsx(BarChartIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Dashboard" })] }), _jsx("button", { onClick: signOut, className: "flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-red-500/20 dark:hover:bg-red-500/80 text-slate-700 dark:text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors", title: "Logout", "data-testid": "signout-btn", children: _jsx(LogOutIcon, { className: "h-5 w-5" }) })] })) : (_jsxs("button", { onClick: () => navigate('/login'), className: "flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors", "data-testid": "login-btn", children: [_jsx(UserIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Admin Login" })] }))] }), _jsx("h1", { className: "text-5xl font-bold text-slate-900 dark:text-white", children: "Adapt Training Platform" }), _jsx("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: "Create interactive training with AI in seconds." })] }), _jsxs("div", { className: "mt-12", children: [_jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center", children: "Start with a Template" }), _jsx("div", { className: "mb-6 max-w-md mx-auto", children: _jsxs("div", { className: "relative", children: [_jsx(SearchIcon, { className: "absolute inset-y-0 left-0 pl-3 h-full w-5 text-slate-400 pointer-events-none" }), _jsx("input", { type: "text", placeholder: "Search templates...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-700 rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500", "data-testid": "template-search-input" }), searchTerm && (_jsx("button", { onClick: () => setSearchTerm(''), className: "absolute inset-y-0 right-0 pr-3 flex items-center", "aria-label": "Clear search", title: "Clear search", children: _jsx(XIcon, { className: "h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" }) }))] }) }), isLoading ? (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsx("div", { className: "h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4 animate-pulse" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(TemplateCardSkeleton, {}), _jsx(TemplateCardSkeleton, {})] })] }), _jsxs("div", { children: [_jsx("div", { className: "h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4 animate-pulse" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: _jsx(TemplateCardSkeleton, {}) })] })] })) : (_jsxs("div", { className: "space-y-8", children: [filteredCategories.length > 0 ? (filteredCategories.map(category => (_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-slate-800 dark:text-slate-200 mb-4", children: category.name }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: category.templates.map(template => (_jsx(TemplateCard, { id: template.id, title: template.title, description: template.description, icon: template.icon, category: category.name }, template.id))) })] }, category.name)))) : searchTerm ? (_jsx("div", { className: "text-center py-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg", children: _jsxs("p", { className: "text-slate-500 dark:text-slate-400", children: ["No templates found matching \"", searchTerm, "\"."] }) })) : (_jsx("div", { className: "text-center py-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg", children: _jsx("p", { className: "text-slate-500 dark:text-slate-400", children: "No templates are available at the moment." }) })), _jsxs("div", { className: "text-center pt-8 mt-8 border-t border-slate-200 dark:border-slate-700", children: [_jsx("h3", { className: "text-xl font-bold text-slate-800 dark:text-slate-200 mb-2", children: searchTerm ? "Didn't find what you need?" : "Or, start from scratch" }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 mb-4", children: "Create a custom training module from a video, device model, or manual." }), _jsxs(Link, { to: "/create", className: "inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors", "data-testid": "create-custom-module-link", title: "Create a custom module from scratch", children: [_jsx(LightbulbIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Create Custom Module" })] })] })] }))] })] }));
};
export default HomePage;
//# sourceMappingURL=HomePage.js.map