import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
const RootLayout = () => {
    return (_jsxs("div", { className: "min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300", children: [_jsx(ScrollToTop, {}), _jsx(Outlet, {})] }));
};
export default RootLayout;
//# sourceMappingURL=RootLayout.js.map