import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from '@/components/Icons';

interface TemplateCardProps {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Icons;
    category: string;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ id, title, description, icon, category }) => {
    // Dynamically select the icon component, with a fallback
    const IconComponent = Icons[icon] || Icons.BookOpenIcon;

    return (
        // Use Link to navigate to the template wizard page
        <Link
            to={`/templates/${id}`}
            className="group block w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg hover:shadow-xl hover:ring-2 hover:ring-indigo-500 dark:hover:ring-indigo-400 transition-all duration-300 transform hover:-translate-y-1"
            title={`Create a module from the "${title}" template`}
            data-testid={`template-card-${id}`}
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg transition-colors group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800">
                    <IconComponent className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 pt-1">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{category}</span>
                </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </Link>
    );
};