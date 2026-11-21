import AsyncStorage from '@react-native-async-storage/async-storage';
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
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  reload: () => Promise<void>;
};

const UniversityContext = createContext<UniversityContextValue | null>(null);

export function UniversityProvider({ children }: { children: ReactNode }) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await api<University[]>('/api/universities', { auth: false });
      setUniversities(data);
      const stored = await AsyncStorage.getItem(UNIVERSITY_KEY);
      setSelectedId((current) => {
        const preferred = current ?? stored;
        if (preferred && data.some((item) => item.id === preferred)) return preferred;
        return data[0]?.id ?? null;
      });
    } catch {
      setUniversities([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const choose = useCallback((id: string) => {
    setSelectedId(id);
    void AsyncStorage.setItem(UNIVERSITY_KEY, id);
  }, []);

  const selected = universities.find((item) => item.id === selectedId) ?? universities[0] ?? null;

  const value = useMemo(
    () => ({ universities, selected, selectedId: selected?.id ?? null, setSelectedId: choose, reload }),
    [universities, selected, choose, reload],
  );

  return <UniversityContext.Provider value={value}>{children}</UniversityContext.Provider>;
}

export function useUniversity() {
  const context = useContext(UniversityContext);
  if (!context) throw new Error('useUniversity must be used inside UniversityProvider');
  return context;
}
