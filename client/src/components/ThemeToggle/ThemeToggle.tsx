"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import "./ThemeToggle.css";

export function ThemeToggle() {
  // Add state to handle mounting
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  // Only show the toggle after mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Simple theme change without any transition effects
  const handleThemeChange = (newTheme: string) => {
    if (theme === newTheme) return;
    setTheme(newTheme);
  };

  // If not mounted yet, render a placeholder to maintain layout
  if (!mounted) {
    return <div className="theme-toggle-container" aria-hidden="true"></div>;
  }

  return (
    <div className="theme-toggle-container">
      <button
        onClick={() => handleThemeChange("light")}
        className={`theme-toggle-btn ${theme === "light" ? "active" : ""}`}
        aria-label="Light mode"
        title="Light mode"
      >
        <Sun className="theme-toggle-icon" />
      </button>
      
      <button
        onClick={() => handleThemeChange("dark")}
        className={`theme-toggle-btn ${theme === "dark" ? "active" : ""}`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Moon className="theme-toggle-icon" />
      </button>
      
      <button
        onClick={() => handleThemeChange("system")}
        className={`theme-toggle-btn ${theme === "system" ? "active" : ""}`}
        aria-label="System preference"
        title="System preference"
      >
        <Monitor className="theme-toggle-icon" />
      </button>
    </div>
  );
}
