import { jsx as _jsx } from "react/jsx-runtime";
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to. This allows us to send them along to that page after they
        // log in, which is a nicer user experience than dropping them off on the home page.
        return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
    }
    return children;
};
export default ProtectedRoute;
//# sourceMappingURL=ProtectedRoute.js.map