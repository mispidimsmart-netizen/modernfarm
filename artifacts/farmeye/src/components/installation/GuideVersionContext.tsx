import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GuideVersion } from '@/data/installationVersionMap';

const STORAGE_KEY = 'farmeye.installGuideVersion';

interface GuideVersionContextValue {
  version: GuideVersion;
  setVersion: (v: GuideVersion) => void;
}

const GuideVersionContext = createContext<GuideVersionContextValue>({
  version: 'v8',
  setVersion: () => {},
});

/** Installation guide version scope (v8 = live production board, v10 = beta). */
export function GuideVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<GuideVersion>(() => {
    if (typeof window === 'undefined') return 'v8';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'v10' ? 'v10' : 'v8';
  });

  const setVersion = useCallback((v: GuideVersion) => {
    setVersionState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  }, []);

  return (
    <GuideVersionContext.Provider value={{ version, setVersion }}>
      {children}
    </GuideVersionContext.Provider>
  );
}

export function useGuideVersion() {
  return useContext(GuideVersionContext);
}
