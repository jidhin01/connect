import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Theme: 'system' | 'light' | 'dark'
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");
    // Typography: 'small' | 'medium' | 'large'
    const [typography, setTypography] = useState(() => localStorage.getItem("typography") || "medium");

    // Apply Theme
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        let effectiveTheme = theme;
        if (theme === "system") {
            effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }

        root.classList.add(effectiveTheme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    // Apply Typography
    useEffect(() => {
        const root = window.document.documentElement;
        // Map sizes to base font-sizes (Tailwind uses rems based on root font-size usually being 16px)
        // We can adjust the root font size percentage to scale everything up/down.
        // Default browser font size is usually 16px.
        // Small: 14px (~87.5%)
        // Medium: 16px (100%)
        // Large: 18px (~112.5%)
        let scale = "100%";
        if (typography === "small") scale = "87.5%"; // 14px
        if (typography === "large") scale = "112.5%"; // 18px

        root.style.fontSize = scale;
        localStorage.setItem("typography", typography);
    }, [typography]);

    // Listen to system changes if theme is system
    useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(mediaQuery.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, typography, setTypography }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
