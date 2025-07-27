import React, { useEffect, useState, useMemo } from 'react';
import { TemplateCard } from '@/components/TemplateCard';
import * as Icons from '@/components/Icons';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@/components/Icons';

interface Template {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Icons;
}

interface TemplateCategory {
    name: string;
    icon: keyof typeof Icons;
    templates: Template[];
}

interface FlatTemplate extends Template {
    category: string;
}

const HomeAiPage: React.FC = () => {
    const [templateData, setTemplateData] = useState<TemplateCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch('/modules/index.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: { categories: TemplateCategory[] } = await response.json();
                setTemplateData(data.categories);
            } catch (err) {
                console.error("Failed to fetch templates:", err);
                setError(err instanceof Error ? err.message : "Failed to load templates.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const flatTemplates = useMemo((): FlatTemplate[] => {
        if (!templateData) return [];
        return templateData.flatMap(category =>
            category.templates.map(template => ({
                ...template,
                category: category.name,
            }))
        );
    }, [templateData]);

    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center p-8 text-slate-500 dark:text-slate-400">Loading AI modules...</p>;
        }

        if (error) {
            return <p className="text-center p-8 text-red-500">{error}</p>;
        }

        if (flatTemplates.length === 0) {
            return <p className="text-center p-8 text-slate-500 dark:text-slate-400">No AI modules are available.</p>;
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {flatTemplates.map(template => (
                    <TemplateCard
                        key={template.id}
                        id={template.id}
                        title={template.title}
                        description={template.description}
                        icon={template.icon}
                        category={template.category}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <header className="mb-12 relative text-center">
                <Link to="/" className="absolute top-0 left-0 flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500">
                    <ArrowLeftIcon className="h-4 w-4" /> Back to Home
                </Link>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">📺 Home AI Modules</h1>
                <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Select a device below to start customizing or training.</p>
            </header>
            {renderContent()}
        </div>
    );
};

export default HomeAiPage;