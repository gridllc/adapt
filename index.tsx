

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
const TemplateGalleryPage = React.lazy(() => import('@/pages/TemplateGalleryPage'));
const HomeAiPage = React.lazy(() => import('@/pages/HomeAiPage'));


// Expose Firebase auth for debugging in development mode
if (import.meta.env.DEV) {
    (window as Window & typeof globalThis & { firebaseAuth: typeof auth }).firebaseAuth = auth;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient();

const router = createBrowserRouter(
    [
        {
            path: '/',
            element: <RootLayout />,
            children: [
                {
                    index: true,
                    element: <HomePage />,
                },
                {
                    path: 'templates',
                    element: <TemplateGalleryPage />,
                },
                {
                    path: 'login',
                    element: <LoginPage />,
                },
                {
                    path: 'reset-password',
                    element: <ForgotPasswordPage />,
                },
                {
                    path: 'update-password',
                    element: <UpdatePasswordPage />,
                },
                {
                    element: (
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    ),
                    children: [
                        {
                            path: 'dashboard',
                            element: <DashboardPage />,
                        },
                        {
                            path: 'home-ai',
                            element: <HomeAiPage />,
                        },
                        {
                            path: 'dashboard/routines',
                            element: <RoutineDashboardPage />
                        },
                        {
                            path: 'dashboard/routines/editor',
                            element: <RoutineEditorPage />
                        },
                        {
                            path: 'dashboard/routines/editor/:routineId',
                            element: <RoutineEditorPage />
                        },
                        {
                            path: 'dashboard/questions',
                            element: <FaqPage />
                        },
                        {
                            path: 'dashboard/questions/:moduleId/:stepIndex/:encodedQuestion',
                            element: <QuestionLogDetailPage />,
                        },
                        {
                            path: 'modules/:moduleId/edit',
                            element: <EditPage />,
                        },
                        {
                            path: 'modules/:moduleId/live',
                            element: <LiveCoachPage />,
                        },
                        {
                            path: 'sessions/:moduleId/:session_key/review',
                            element: <SessionReviewPage />,
                        },
                        {
                            path: 'create',
                            element: <CreatePage />,
                        },
                        {
                            path: 'templates/:templateId',
                            element: <TemplateWizardPage />
                        },
                        {
                            path: 'templates/edit/:slug',
                            element: <RoutineEditorPage />,
                        }
                    ]
                },
                {
                    path: 'modules/:moduleId',
                    element: <TrainingPage />,
                },
                {
                    path: '*',
                    element: <NotFoundPage />,
                }
            ],
        },
    ]
);

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <p className="text-xl text-slate-700 dark:text-slate-300">Loading page...</p>
    </div>
);

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider debug={import.meta.env.DEV}>
                    <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                            <RouterProvider router={router} />
                        </Suspense>
                        <PwaUpdater />
                    </ToastProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);