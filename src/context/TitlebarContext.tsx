import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface TitlebarTabConfig {
  id: string;
  title: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
}

export interface TitlebarAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export interface TitlebarState {
  tabs: TitlebarTabConfig[];
  activeTabId?: string;
  showTabs: boolean;
  actions: TitlebarAction[];
}

interface TitlebarContextValue extends TitlebarState {
  setTabs: (tabs: TitlebarTabConfig[]) => void;
  setActiveTab: (tabId?: string) => void;
  setShowTabs: (show: boolean) => void;
  clearTabs: () => void;
  setActions: (actions: TitlebarAction[]) => void;
  clearActions: () => void;
}

const TitlebarContext = createContext<TitlebarContextValue | undefined>(undefined);

export const TitlebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabsState] = useState<TitlebarTabConfig[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(undefined);
  const [showTabs, setShowTabsState] = useState(false);
  const [actions, setActionsState] = useState<TitlebarAction[]>([]);
  const activeTabRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    activeTabRef.current = activeTabId;
  }, [activeTabId]);

  const setActiveTab = useCallback((tabId?: string) => {
    activeTabRef.current = tabId;
    setActiveTabId((prev) => (prev === tabId ? prev : tabId));
  }, []);

  const setTabs = useCallback((nextTabs: TitlebarTabConfig[]) => {
    setTabsState((prevTabs) => {
      if (prevTabs.length === nextTabs.length) {
        const same = prevTabs.every((tab, index) => {
          const candidate = nextTabs[index];
          return tab.id === candidate.id && tab.title === candidate.title;
        });
        if (same) {
          return prevTabs;
        }
      }
      return nextTabs;
    });

    const currentActive = activeTabRef.current;

    if (!nextTabs.length) {
      setActiveTab(undefined);
      return;
    }

    const hasActive = nextTabs.some((tab) => tab.id === currentActive);
    if (!hasActive) {
      setActiveTab(nextTabs[0].id);
    }
  }, [setActiveTab]);

  const setShowTabs = useCallback((show: boolean) => {
    setShowTabsState((prev) => (prev === show ? prev : show));
  }, []);

  const clearTabs = useCallback(() => {
    setTabsState([]);
    setShowTabsState(false);
    setActiveTab(undefined);
  }, [setActiveTab]);

  const setActions = useCallback((next: TitlebarAction[]) => {
    setActionsState(next);
  }, []);

  const clearActions = useCallback(() => {
    setActionsState([]);
  }, []);

  const value = useMemo<TitlebarContextValue>(
    () => ({
      tabs,
      activeTabId,
      showTabs,
      actions,
      setTabs,
      setActiveTab,
      setShowTabs,
      clearTabs,
      setActions,
      clearActions,
    }),
    [tabs, activeTabId, showTabs, actions, setTabs, setActiveTab, setShowTabs, clearTabs, setActions, clearActions]
  );

  return <TitlebarContext.Provider value={value}>{children}</TitlebarContext.Provider>;
};

export const useTitlebar = (): TitlebarContextValue => {
  const context = useContext(TitlebarContext);
  if (!context) {
    throw new Error('useTitlebar must be used within a TitlebarProvider');
  }
  return context;
};
