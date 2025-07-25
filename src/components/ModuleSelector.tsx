

// src/components/ModuleSelector.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Template {
    id: string;
    title: string;
    description: string;
}

interface TemplateCategory {
    name: string;
    templates: Template[];
}

export const ModuleSelector: React.FC = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch('/modules/index.json');
                const data = await response.json();
                // Flatten templates from categories for a simple list
                const allTemplates = data.categories.flatMap((category: TemplateCategory) => category.templates);
                setTemplates(allTemplates);
            } catch (error) {
                console.error("Failed to fetch templates:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const handleSelect = (slug: string) => {
        // Navigate to the template wizard page, as you cannot "edit" a template directly.
        // The wizard will then create a new module from the template.
        navigate(`/templates/${slug}`);
    };

    if (isLoading) return <p className="text-center text-slate-500 dark:text-slate-400">Loading templates...</p>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-xl font-bold mb-4">Choose a Template to Create a Module</h2>
            <div className="grid grid-cols-1 gap-4">
                {templates.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => handleSelect(mod.id)}
                        className="p-4 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left shadow-sm transition-colors"
                    >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{mod.title}</div>
                        {mod.description && <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{mod.description}</div>}
                    </button>
                ))}
            </div>
        </div>
    );
};