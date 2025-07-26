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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const useAuth_1 = require("@/hooks/useAuth");
const useTheme_1 = require("@/hooks/useTheme");
const Icons_1 = require("@/components/Icons");
const AdminLayout = () => {
    const { user, signOut } = (0, useAuth_1.useAuth)();
    const { theme, toggleTheme } = (0, useTheme_1.useTheme)();
    const [sidebarOpen, setSidebarOpen] = (0, react_1.useState)(false);
    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: Icons_1.BarChartIcon },
        { to: '/dashboard/routines', label: 'Routines', icon: Icons_1.PlayCircleIcon },
        { to: '/create', label: 'Create Module', icon: Icons_1.LightbulbIcon },
        { to: '/dashboard/questions', label: 'Question Log', icon: Icons_1.HelpCircleIcon },
        { to: '/home-ai', label: 'Home AI', icon: Icons_1.HomeIcon },
    ];
    const NavContent = () => (<>
            {navLinks.map(({ to, label, icon: Icon }) => (<react_router_dom_1.NavLink key={to} to={to} end={to === '/dashboard'} onClick={() => setSidebarOpen(false)} // Close on click for mobile
         className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <Icon className="h-5 w-5"/>
                    <span>{label}</span>
                </react_router_dom_1.NavLink>))}
        </>);
    return (<div className="flex h-screen bg-slate-100 dark:bg-slate-900">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col">
                <div className="h-16 flex items-center justify-center px-4 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">Adapt Admin</h1>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <NavContent />
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate" title={user?.email || ''}>{user?.email}</span>
                        <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Toggle theme">
                            {theme === 'dark' ? <Icons_1.SunIcon className="h-5 w-5"/> : <Icons_1.MoonIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                    <button onClick={signOut} className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-red-500/20 dark:hover:bg-red-500/80 text-slate-700 dark:text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors" title="Logout">
                        <Icons_1.LogOutIcon className="h-5 w-5"/>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <div className="flex flex-col flex-1">
                {/* Top Bar (Mobile) */}
                <header className="md:hidden h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-600 dark:text-slate-300 p-2">
                        <Icons_1.MenuIcon className="h-6 w-6"/>
                    </button>
                    <h1 className="text-lg font-bold text-indigo-500 dark:text-indigo-400">Adapt Admin</h1>
                    <div className="w-8"></div> {/* Spacer */}
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <react_router_dom_1.Outlet />
                </main>
            </div>

            {/* Mobile Sidebar Drawer */}
            {sidebarOpen && (<>
                    <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
                    <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-40 animate-fade-in-up">
                        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <h1 className="text-xl font-bold text-indigo-500 dark:text-indigo-400">Menu</h1>
                            <button onClick={() => setSidebarOpen(false)} className="text-slate-600 dark:text-slate-300 p-2">
                                <Icons_1.XIcon className="h-6 w-6"/>
                            </button>
                        </div>
                        <nav className="flex-1 px-4 py-6 space-y-2">
                            <NavContent />
                        </nav>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={signOut} className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-red-500/20 dark:hover:bg-red-500/80 text-slate-700 dark:text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors" title="Logout">
                                <Icons_1.LogOutIcon className="h-5 w-5"/>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>)}
        </div>);
};
exports.default = AdminLayout;
