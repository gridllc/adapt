import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Corrected import paths based on the project file structure
import RootLayout from '@/RootLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ToastProvider } from '@/hooks/useToast';
import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/hooks/useAuth';
import '@/index.css';
import { PwaUpdater } from '@/components/PwaUpdater';
import AdminLayout from '@/components/AdminLayout';
import { auth } from '@/firebase';
// Lazy load pages for better performance and code splitting
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const TrainingPage = React.lazy(() => import('@/pages/TrainingPage'));
const CreatePage = React.lazy(() => import('@/pages/CreatePage'));
const EditPage = React.lazy(() => import('@/pages/EditPage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/ForgotPasswordPage'));
const UpdatePasswordPage = React.lazy(() => import('@/pages/UpdatePasswordPage'));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const RoutineDashboardPage = React.lazy(() => import('@/pages/RoutineDashboardPage'));
const RoutineEditorPage = React.lazy(() => import('@/pages/RoutineEditorPage'));
const FaqPage = React.lazy(() => import('@/pages/FaqPage'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'));
const LiveCoachPage = React.lazy(() => import('@/pages/LiveCoachPage'));
const SessionReviewPage = React.lazy(() => import('@/pages/SessionReviewPage'));
const QuestionLogDetailPage = React.lazy(() => import('@/pages/QuestionLogDetailPage'));
const TemplateWizardPage = React.lazy(() => import('@/pages/TemplateWizardPage'));
// Expose Firebase auth for debugging in development mode
if (import.meta.env.DEV) {
    window.firebaseAuth = auth;
}
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}
const queryClient = new QueryClient();
const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(RootLayout, {}),
        children: [
            {
                index: true,
                element: _jsx(HomePage, {}),
            },
            {
                path: 'templates',
                element: _jsx(HomePage, {}),
            },
            {
                path: 'login',
                element: _jsx(LoginPage, {}),
            },
            {
                path: 'reset-password',
                element: _jsx(ForgotPasswordPage, {}),
            },
            {
                path: 'update-password',
                element: _jsx(UpdatePasswordPage, {}),
            },
            {
                element: (_jsx(ProtectedRoute, { children: _jsx(AdminLayout, {}) })),
                children: [
                    {
                        path: 'dashboard',
                        element: _jsx(DashboardPage, {}),
                    },
                    {
                        path: 'dashboard/routines',
                        element: _jsx(RoutineDashboardPage, {})
                    },
                    {
                        path: 'dashboard/routines/editor',
                        element: _jsx(RoutineEditorPage, {})
                    },
                    {
                        path: 'dashboard/routines/editor/:routineId',
                        element: _jsx(RoutineEditorPage, {})
                    },
                    {
                        path: 'dashboard/questions',
                        element: _jsx(FaqPage, {})
                    },
                    {
                        path: 'dashboard/questions/:moduleId/:stepIndex/:encodedQuestion',
                        element: _jsx(QuestionLogDetailPage, {}),
                    },
                    {
                        path: 'modules/:moduleId/edit',
                        element: _jsx(EditPage, {}),
                    },
                    {
                        path: 'modules/:moduleId/live',
                        element: _jsx(LiveCoachPage, {}),
                    },
                    {
                        path: 'sessions/:moduleId/:session_key/review',
                        element: _jsx(SessionReviewPage, {}),
                    },
                    {
                        path: 'create',
                        element: _jsx(CreatePage, {}),
                    },
                    {
                        path: 'templates/:templateId',
                        element: _jsx(TemplateWizardPage, {})
                    }
                ]
            },
            {
                path: 'modules/:moduleId',
                element: _jsx(TrainingPage, {}),
            },
            {
                path: '*',
                element: _jsx(NotFoundPage, {}),
            }
        ],
    },
]);
const LoadingFallback = () => (_jsx("div", { className: "flex items-center justify-center h-screen bg-white dark:bg-slate-900", children: _jsx("p", { className: "text-xl text-slate-700 dark:text-slate-300", children: "Loading page..." }) }));
const root = ReactDOM.createRoot(rootElement);
root.render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ThemeProvider, { children: _jsx(AuthProvider, { debug: import.meta.env.DEV, children: _jsxs(ToastProvider, { children: [_jsx(Suspense, { fallback: _jsx(LoadingFallback, {}), children: _jsx(RouterProvider, { router: router }) }), _jsx(PwaUpdater, {})] }) }) }) }) }));
//# sourceMappingURL=index.js.map