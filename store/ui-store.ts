import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

function getInitialSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('quorum-sidebar-open');
  return stored !== null ? stored === 'true' : true;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: getInitialSidebarOpen(),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen;
      localStorage.setItem('quorum-sidebar-open', String(next));
      return { sidebarOpen: next };
    }),
  setSidebarOpen: (open) => {
    localStorage.setItem('quorum-sidebar-open', String(open));
    set({ sidebarOpen: open });
  },
}));
