'use client';
import { create } from 'zustand';
import { DEMO_DATES } from '@/lib/ocean-simulation';

interface OceanState {
  selectedDate: string;
  selectedRegion: 'ARABIAN_SEA' | 'BAY_OF_BENGAL' | 'FULL_DOMAIN';
  selectedLat: number | null;
  selectedLon: number | null;
  activeLayer: string;
  isRunningInference: boolean;
  inferenceStep: number; // 0-5
  juryDemoMode: boolean;
  juryDemoStep: number;
  setDate: (date: string) => void;
  setRegion: (r: 'ARABIAN_SEA' | 'BAY_OF_BENGAL' | 'FULL_DOMAIN') => void;
  setLocation: (lat: number, lon: number) => void;
  setLayer: (layer: string) => void;
  runInference: () => void;
  setJuryDemoMode: (v: boolean) => void;
  setJuryDemoStep: (s: number) => void;
}

export const useOceanStore = create<OceanState>((set, get) => ({
  selectedDate: DEMO_DATES[0],
  selectedRegion: 'ARABIAN_SEA',
  selectedLat: 15,
  selectedLon: 65,
  activeLayer: 'SST',
  isRunningInference: false,
  inferenceStep: -1,
  juryDemoMode: false,
  juryDemoStep: 0,
  setDate: (date) => set({ selectedDate: date }),
  setRegion: (r) => set({ selectedRegion: r }),
  setLocation: (lat, lon) => set({ selectedLat: lat, selectedLon: lon }),
  setLayer: (layer) => set({ activeLayer: layer }),
  runInference: async () => {
    set({ isRunningInference: true, inferenceStep: 0 });
    for (let i = 1; i <= 5; i++) {
      await new Promise(r => setTimeout(r, 600));
      set({ inferenceStep: i });
    }
    await new Promise(r => setTimeout(r, 400));
    set({ isRunningInference: false, inferenceStep: -1 });
  },
  setJuryDemoMode: (v) => set({ juryDemoMode: v }),
  setJuryDemoStep: (s) => set({ juryDemoStep: s }),
}));
