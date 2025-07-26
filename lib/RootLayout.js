"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const ScrollToTop_1 = __importDefault(require("@/components/ScrollToTop"));
const RootLayout = () => {
    return (<div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
            <ScrollToTop_1.default />
            <react_router_dom_1.Outlet />
        </div>);
};
exports.default = RootLayout;
