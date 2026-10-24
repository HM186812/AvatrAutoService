import { useSyncExternalStore } from 'react';
import { SystemUser, Language } from '../types';

export interface AppState {
  currentUser: SystemUser | null;
  lang: Language;
  isDark: boolean;
  activeView: string;
}

let state: AppState = {
  currentUser: null,
  lang: 'th',
  isDark: true,
  activeView: 'dashboard',
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const appStore = {
  getState(): AppState {
    return state;
  },
  setState(partial: Partial<AppState>) {
    state = { ...state, ...partial };
    emitChange();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    appStore.subscribe,
    () => selector(state),
    () => selector(state)
  );
}
