"use client"

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);
  
  // Only render children once mounted on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by using this approach
  return (
    <NextThemesProvider {...props}>
      {mounted ? children : <div style={{ visibility: "hidden" }} suppressHydrationWarning />}
    </NextThemesProvider>
  );
}
