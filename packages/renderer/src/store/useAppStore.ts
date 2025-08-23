import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface AppState {
  count: number
  theme: 'light' | 'dark'
  increment: () => void
  decrement: () => void
  toggleTheme: () => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      count: 0,
      theme: 'light' as const,
      increment: () => set((state: AppState) => ({ count: state.count + 1 }), false, 'increment'),
      decrement: () => set((state: AppState) => ({ count: state.count - 1 }), false, 'decrement'),
      toggleTheme: () =>
        set(
          (state: AppState) => ({
            theme: state.theme === 'light' ? 'dark' : 'light',
          }),
          false,
          'toggleTheme'
        ),
      reset: () => set({ count: 0 }, false, 'reset'),
    }),
    {
      name: 'app-store', // DevTools 中显示的名称
    }
  )
)
