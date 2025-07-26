"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const useAuth_1 = require("@/hooks/useAuth");
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = (0, useAuth_1.useAuth)();
    const location = (0, react_router_dom_1.useLocation)();
    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to. This allows us to send them along to that page after they
        // log in, which is a nicer user experience than dropping them off on the home page.
        return <react_router_dom_1.Navigate to="/login" state={{ from: location }} replace/>;
    }
    return children;
};
exports.default = ProtectedRoute;
