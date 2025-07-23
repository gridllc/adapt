import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Corrected import paths based on the project file structure
import RootLayout from '@/RootLayout';
import HomePage from '@/pages/HomePage';
import TrainingPage from '@/pages/TrainingPage';
import CreatePage from '@/pages/CreatePage';
import EditPage from '@/pages/EditPage';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import DashboardPage from './pages/DashboardPage';
import RoutineDashboardPage from './pages/RoutineDashboardPage';
import RoutineEditorPage from './pages/RoutineEditorPage';
import FaqPage from '@/pages/FaqPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ToastProvider } from '@/hooks/useToast';
import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/hooks/useAuth';
import '@/index.css';
import LiveCoachPage from '@/pages/LiveCoachPage';
import SessionReviewPage from '@/pages/SessionReviewPage';
import { PwaUpdater } from '@/components/PwaUpdater';
import QuestionLogDetailPage from '@/pages/QuestionLogDetailPage';
import AdminLayout from '@/components/AdminLayout';
import { auth } from '@/firebase';
import TemplateWizardPage from './pages/TemplateWizardPage';

// Expose Firebase auth for debugging in development mode
if (import.meta.env.DEV) {
    (window as Window & typeof globalThis & { firebaseAuth: typeof auth }).firebaseAuth = auth;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient();

const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                index: true,
                element: <HomePage />,
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
]);


const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider debug={import.meta.env.DEV}>
                    <ToastProvider>
                        <RouterProvider router={router} />
                        <PwaUpdater />
                    </ToastProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);