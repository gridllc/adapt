import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { LogOutIcon, UserIcon, BarChartIcon, SunIcon, MoonIcon, SearchIcon, XIcon, LightbulbIcon } from '@/components/Icons';
import * as Icons from '@/components/Icons';
import { TemplateCard } from '@/components/TemplateCard';

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

// Skeleton loader component for template cards to improve perceived performance
const TemplateCardSkeleton = () => (
    <div className="w-full text-left p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg">
        <div className="flex items-start gap-4 mb-4 animate-pulse">
            <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-lg">
                <div className="h-6 w-6 bg-slate-300 dark:bg-slate-600 rounded"></div>
            </div>
            <div className="flex-1 space-y-2 pt-1">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
        </div>
        <div className="w-full h-9 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
    </div>
);


const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [templateData, setTemplateData] = useState<TemplateCategory[]>([]);
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
            } catch (error) {
                console.error("Failed to fetch templates:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const filteredCategories = useMemo(() => {
        if (!templateData) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        if (!lowercasedTerm) return templateData;

        return templateData
            .map(category => ({
                ...category,
                templates: category.templates.filter(template =>
                    template.title.toLowerCase().includes(lowercasedTerm) ||
                    template.description.toLowerCase().includes(lowercasedTerm)
                ),
            }))
            .filter(category => category.templates.length > 0);
    }, [templateData, searchTerm]);

    return (
        <div className="w-full max-w-screen-md mx-auto px-4 py-12">
            <header className="mb-12 relative text-center">
                <div className="absolute top-0 right-0 flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                        data-testid="theme-toggle-btn"
                    >
                        {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>
                    {isAuthenticated && user ? (
                        <>
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors"
                                title="Go to Dashboard"
                                data-testid="dashboard-link"
                            >
                                <BarChartIcon className="h-5 w-5" />
                                <span>Dashboard</span>
                            </Link>
                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-red-500/20 dark:hover:bg-red-500/80 text-slate-700 dark:text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors"
                                title="Logout"
                                data-testid="signout-btn"
                            >
                                <LogOutIcon className="h-5 w-5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors"
                            data-testid="login-btn"
                        >
                            <UserIcon className="h-5 w-5" />
                            <span>Admin Login</span>
                        </button>
                    )}
                </div>
                <h1 className="text-5xl font-bold text-slate-900 dark:text-white">Adapt Training Platform</h1>
                <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">Create interactive training with AI in seconds.</p>
            </header>

            <div className="mt-12">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Start with a Template</h2>
                <div className="mb-6 max-w-md mx-auto">
                    <div className="relative">
                        <SearchIcon className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-700 rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            data-testid="template-search-input"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                aria-label="Clear search"
                                title="Clear search"
                            >
                                <XIcon className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-8">
                        <div>
                            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4 animate-pulse"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TemplateCardSkeleton />
                                <TemplateCardSkeleton />
                            </div>
                        </div>
                        <div>
                            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TemplateCardSkeleton />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map(category => (
                                <div key={category.name}>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">{category.name}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {category.templates.map(template => (
                                            <TemplateCard
                                                key={template.id}
                                                id={template.id}
                                                title={template.title}
                                                description={template.description}
                                                icon={template.icon}
                                                category={category.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : searchTerm ? (
                            <div className="text-center py-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                <p className="text-slate-500 dark:text-slate-400">No templates found matching &quot;{searchTerm}&quot;.</p>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                <p className="text-slate-500 dark:text-slate-400">No templates are available at the moment.</p>
                            </div>
                        )}

                        <div className="text-center pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                                {searchTerm ? "Didn't find what you need?" : "Or, start from scratch"}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-4">Create a custom training module from a video, device model, or manual.</p>
                            <Link
                                to="/create"
                                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                                data-testid="create-custom-module-link"
                                title="Create a custom module from scratch"
                            >
                                <LightbulbIcon className="h-5 w-5" />
                                <span>Create Custom Module</span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;