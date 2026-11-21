'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, UNIVERSITY_KEY } from '@/lib/api';
import type { University } from '@/lib/types';

type UniversityContextValue = {
  universities: University[];
  selected: University | null;
  select: (university: University) => void;
  loading: boolean;
  reload: () => Promise<void>;
};

const UniversityContext = createContext<UniversityContextValue | null>(null);

export function UniversityProvider({ children }: { children: ReactNode }) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [selected, setSelected] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api<University[]>('/api/universities');
      setUniversities(list);
      const storedId = localStorage.getItem(UNIVERSITY_KEY);
      const match =
        list.find((item) => item.id === storedId) ??
        list.find((item) => item.shortName === 'UDOM') ??
        list[0] ??
        null;
      setSelected(match);
      if (match) localStorage.setItem(UNIVERSITY_KEY, match.id);
    } catch {
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const select = useCallback((university: University) => {
    setSelected(university);
    localStorage.setItem(UNIVERSITY_KEY, university.id);
  }, []);

  const value = useMemo(
    () => ({ universities, selected, select, loading, reload: load }),
    [universities, selected, select, loading, load],
  );

  return <UniversityContext.Provider value={value}>{children}</UniversityContext.Provider>;
}

export function useUniversity() {
  const context = useContext(UniversityContext);
  if (!context) throw new Error('useUniversity must be used inside UniversityProvider');
  return context;
}
