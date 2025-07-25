import React from 'react';
import { Outlet } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';

const RootLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
            <ScrollToTop />
            <Outlet />
        </div>
    );
};

export default RootLayout;