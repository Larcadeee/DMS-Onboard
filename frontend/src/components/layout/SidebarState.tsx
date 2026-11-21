"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface SidebarState {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarStateContext = createContext<SidebarState | null>(null);

export function SidebarStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("sidebar_collapsed") === "true");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed }),
    [collapsed, toggleCollapsed]
  );

  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState(): SidebarState {
  const context = useContext(SidebarStateContext);

  if (!context) {
    throw new Error("useSidebarState must be used inside SidebarStateProvider");
  }

  return context;
}
