import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from '@/components/Icons';

interface Template {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Icons;
}

interface TemplateCardProps {
    template: Template;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
    const IconComponent = Icons[template.icon] || Icons.HelpCircleIcon;

    return (
        <div className="w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl hover:ring-2 hover:ring-indigo-500 transition-all duration-300 transform hover:-translate-y-1 shadow-md dark:shadow-lg hover:shadow-xl dark:hover:shadow-indigo-500/20">
            <div className="flex items-start gap-4 mb-4">
                <div className="bg-indigo-100 dark:bg-indigo-600/30 p-3 rounded-lg">
                    <IconComponent className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{template.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{template.description}</p>
                </div>
            </div>
            <Link
                to={`/templates/${template.id}`}
                className="w-full text-center block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Use This Template
            </Link>
        </div>
    );
};
