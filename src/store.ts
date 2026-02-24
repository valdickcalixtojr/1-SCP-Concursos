import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Concurso {
  id: string;
  source: string;
  institution: string;
  location: string;
  board: string;
  vacancies: string;
  salary: string;
  registration_end: string;
  exemption_period: string;
  exam_date: string;
  link: string;
  positions?: string;
  subjects?: string;
  interest_status: 'none' | 'interested' | 'ignored';
  is_enrolled: boolean;
  exam_location?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

interface ConcursoStore {
  concursos: Concurso[];
  setConcursos: (concursos: Concurso[]) => void;
  updateConcurso: (id: string, updates: Partial<Concurso>) => void;
  markInterest: (id: string, status: 'interested' | 'ignored' | 'none') => void;
}

export const useConcursoStore = create<ConcursoStore>()(
  persist(
    (set) => ({
      concursos: [],
      setConcursos: (concursos) => set({ concursos }),
      updateConcurso: (id, updates) =>
        set((state) => ({
          concursos: state.concursos.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      markInterest: (id, status) =>
        set((state) => ({
          concursos: state.concursos.map((c) =>
            c.id === id ? { ...c, interest_status: status } : c
          ),
        })),
    }),
    {
      name: 'concursos-storage',
    }
  )
);
