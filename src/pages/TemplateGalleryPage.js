import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { TemplateCard } from '@/components/TemplateCard';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@/components/Icons';
const TemplateGalleryPage = () => {
    const [templateData, setTemplateData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
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
            catch (err) {
                console.error("Failed to fetch templates:", err);
                setError(err instanceof Error ? err.message : "Failed to load templates.");
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);
    const flatTemplates = useMemo(() => {
        if (!templateData)
            return [];
        return templateData.flatMap(category => category.templates.map(template => ({
            ...template,
            category: category.name,
        })));
    }, [templateData]);
    const renderContent = () => {
        if (isLoading) {
            return _jsx("p", { className: "text-center p-8 text-slate-500 dark:text-slate-400", children: "Loading templates..." });
        }
        if (error) {
            return _jsx("p", { className: "text-center p-8 text-red-500", children: error });
        }
        if (flatTemplates.length === 0) {
            return _jsx("p", { className: "text-center p-8 text-slate-500 dark:text-slate-400", children: "No templates are available at the moment." });
        }
        return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", children: flatTemplates.map(template => (_jsx(TemplateCard, { id: template.id, title: template.title, description: template.description, icon: template.icon, category: template.category }, template.id))) }));
    };
    return (_jsxs("div", { className: "max-w-6xl mx-auto px-4 py-12", children: [_jsxs("header", { className: "mb-12 relative text-center", children: [_jsxs(Link, { to: "/", className: "absolute top-0 left-0 flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500", children: [_jsx(ArrowLeftIcon, { className: "h-4 w-4" }), " Back to Home"] }), _jsx("h1", { className: "text-4xl font-bold text-slate-900 dark:text-white", children: "Training Templates" }), _jsx("p", { className: "mt-2 text-lg text-slate-500 dark:text-slate-400", children: "Select a template to begin creating a new training module." })] }), renderContent()] }));
};
export default TemplateGalleryPage;
//# sourceMappingURL=TemplateGalleryPage.js.map