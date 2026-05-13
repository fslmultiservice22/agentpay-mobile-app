import { useState, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';

export interface BrowserHistory {
  url: string;
  title: string;
  timestamp: number;
  favicon?: string;
}

export interface BrowserState {
  isOpen: boolean;
  currentUrl: string | null;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  history: BrowserHistory[];
  bookmarks: BrowserHistory[];
  error: string | null;
}

export function useInAppBrowser() {
  const [state, setState] = useState<BrowserState>({
    isOpen: false,
    currentUrl: null,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    history: [],
    bookmarks: [],
    error: null,
  });

  const historyIndexRef = useRef(0);
  const isMountedRef = useRef(true);

  // Apri il browser
  const openBrowser = useCallback(async (url: string) => {
    try {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOpen: true,
          currentUrl: url,
          isLoading: true,
          error: null,
        }));
      }

      // Aggiungi alla cronologia
      const newHistory: BrowserHistory = {
        url,
        title: url,
        timestamp: Date.now(),
      };

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          history: [newHistory, ...prev.history].slice(0, 50), // Mantieni ultimi 50
          isLoading: false,
          canGoBack: true,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open browser';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Chiudi il browser
  const closeBrowser = useCallback(() => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isOpen: false,
        currentUrl: null,
      }));
    }
  }, []);

  // Vai indietro
  const goBack = useCallback(() => {
    if (state.history.length > 1 && historyIndexRef.current < state.history.length - 1) {
      historyIndexRef.current += 1;
      const previousUrl = state.history[historyIndexRef.current].url;

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          currentUrl: previousUrl,
          canGoBack: historyIndexRef.current < prev.history.length - 1,
          canGoForward: historyIndexRef.current > 0,
        }));
      }
    }
  }, [state.history]);

  // Vai avanti
  const goForward = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const nextUrl = state.history[historyIndexRef.current].url;

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          currentUrl: nextUrl,
          canGoBack: historyIndexRef.current < prev.history.length - 1,
          canGoForward: historyIndexRef.current > 0,
        }));
      }
    }
  }, [state.history]);

  // Ricarica la pagina
  const reload = useCallback(() => {
    if (state.currentUrl) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: true,
        }));
      }

      // Simula il caricamento
      setTimeout(() => {
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      }, 1000);
    }
  }, [state.currentUrl]);

  // Aggiungi ai segnalibri
  const addBookmark = useCallback((url: string, title: string) => {
    const bookmark: BrowserHistory = {
      url,
      title,
      timestamp: Date.now(),
    };

    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        bookmarks: [bookmark, ...prev.bookmarks].slice(0, 50),
      }));
    }
  }, []);

  // Rimuovi dai segnalibri
  const removeBookmark = useCallback((url: string) => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        bookmarks: prev.bookmarks.filter(b => b.url !== url),
      }));
    }
  }, []);

  // Pulisci la cronologia
  const clearHistory = useCallback(() => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        history: [],
        currentUrl: null,
        isOpen: false,
      }));
      historyIndexRef.current = 0;
    }
  }, []);

  // Apri URL esterno
  const openExternalBrowser = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error('Failed to open external browser:', err);
    }
  }, []);

  // Naviga a URL
  const navigateTo = useCallback((url: string) => {
    // Aggiungi il protocollo se manca
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    openBrowser(fullUrl);
  }, [openBrowser]);

  return {
    ...state,
    openBrowser,
    closeBrowser,
    goBack,
    goForward,
    reload,
    addBookmark,
    removeBookmark,
    clearHistory,
    openExternalBrowser,
    navigateTo,
  };
}
