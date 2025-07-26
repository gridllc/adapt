"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
/**
 * A headless component that scrolls the window to the top on every route change.
 * This ensures users don't start on a new page scrolled down.
 */
const ScrollToTop = () => {
    const { pathname } = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};
exports.default = ScrollToTop;
