import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ModuleSelector.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
export const ModuleSelector = () => {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch('/modules/index.json');
                const data = await response.json();
                // Flatten templates from categories for a simple list
                const allTemplates = data.categories.flatMap((category) => category.templates);
                setTemplates(allTemplates);
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
    const handleSelect = (slug) => {
        // Navigate to the template wizard page, as you cannot "edit" a template directly.
        // The wizard will then create a new module from the template.
        navigate(`/templates/${slug}`);
    };
    if (isLoading)
        return _jsx("p", { className: "text-center text-slate-500 dark:text-slate-400", children: "Loading templates..." });
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-4", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Choose a Template to Create a Module" }), _jsx("div", { className: "grid grid-cols-1 gap-4", children: templates.map((mod) => (_jsxs("button", { onClick: () => handleSelect(mod.id), className: "p-4 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left shadow-sm transition-colors", children: [_jsx("div", { className: "font-semibold text-slate-800 dark:text-slate-200", children: mod.title }), mod.description && _jsx("div", { className: "text-sm text-slate-600 dark:text-slate-400 mt-1", children: mod.description })] }, mod.id))) })] }));
};
//# sourceMappingURL=ModuleSelector.js.map