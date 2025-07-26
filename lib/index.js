"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
// Corrected import paths based on the project file structure
const RootLayout_1 = __importDefault(require("@/RootLayout"));
const ProtectedRoute_1 = __importDefault(require("@/components/ProtectedRoute"));
const useToast_1 = require("@/hooks/useToast");
const useTheme_1 = require("@/hooks/useTheme");
const useAuth_1 = require("@/hooks/useAuth");
require("@/index.css");
const PwaUpdater_1 = require("@/components/PwaUpdater");
const AdminLayout_1 = __importDefault(require("@/components/AdminLayout"));
const firebase_1 = require("@/firebase");
// Lazy load pages for better performance and code splitting
const HomePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/HomePage'))));
const TrainingPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/TrainingPage'))));
const CreatePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/CreatePage'))));
const EditPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/EditPage'))));
const LoginPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/LoginPage'))));
const ForgotPasswordPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ForgotPasswordPage'))));
const UpdatePasswordPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/UpdatePasswordPage'))));
const DashboardPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/DashboardPage'))));
const RoutineDashboardPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/RoutineDashboardPage'))));
const RoutineEditorPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/RoutineEditorPage'))));
const FaqPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/FaqPage'))));
const NotFoundPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/NotFoundPage'))));
const LiveCoachPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/LiveCoachPage'))));
const SessionReviewPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/SessionReviewPage'))));
const QuestionLogDetailPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/QuestionLogDetailPage'))));
const TemplateWizardPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/TemplateWizardPage'))));
// Expose Firebase auth for debugging in development mode
if (import.meta.env.DEV) {
    window.firebaseAuth = firebase_1.auth;
}
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}
const queryClient = new react_query_1.QueryClient();
const router = (0, react_router_dom_1.createBrowserRouter)([
    {
        path: '/',
        element: <RootLayout_1.default />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'templates',
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
                element: (<ProtectedRoute_1.default>
                            <AdminLayout_1.default />
                        </ProtectedRoute_1.default>),
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
const LoadingFallback = () => (<div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <p className="text-xl text-slate-700 dark:text-slate-300">Loading page...</p>
    </div>);
const root = client_1.default.createRoot(rootElement);
root.render(<react_1.default.StrictMode>
        <react_query_1.QueryClientProvider client={queryClient}>
            <useTheme_1.ThemeProvider>
                <useAuth_1.AuthProvider debug={import.meta.env.DEV}>
                    <useToast_1.ToastProvider>
                        <react_1.Suspense fallback={<LoadingFallback />}>
                            <react_router_dom_1.RouterProvider router={router}/>
                        </react_1.Suspense>
                        <PwaUpdater_1.PwaUpdater />
                    </useToast_1.ToastProvider>
                </useAuth_1.AuthProvider>
            </useTheme_1.ThemeProvider>
        </react_query_1.QueryClientProvider>
    </react_1.default.StrictMode>);
