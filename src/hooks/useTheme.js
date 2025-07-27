import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useState, useContext, useEffect, useMemo } from 'react';
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // This function runs only on initial mount.
        if (typeof window === 'undefined')
            return 'light'; // Default for SSR
        const storedTheme = window.localStorage.getItem('theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }
        // If no theme is stored, use system preference.
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark';
        root.classList.toggle('dark', isDark);
        try {
            window.localStorage.setItem('theme', theme);
        }
        catch (e) {
            console.error("Failed to save theme to localStorage", e);
        }
    }, [theme]);
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
//# sourceMappingURL=useTheme.js.map