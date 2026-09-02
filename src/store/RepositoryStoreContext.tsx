import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand/react';
import type { RepositoryState, RepositoryStore } from './repositoryStore';

const RepositoryStoreContext = createContext<RepositoryStore | null>(null);

export function RepositoryStoreProvider({
  store,
  children,
}: {
  store: RepositoryStore;
  children: ReactNode;
}) {
  return <RepositoryStoreContext.Provider value={store}>{children}</RepositoryStoreContext.Provider>;
}

export function useRepositoryStoreApi(): RepositoryStore {
  const store = useContext(RepositoryStoreContext);
  if (!store) {
    throw new Error('useRepositoryStoreApi must be used within RepositoryStoreProvider');
  }
  return store;
}

export function useRepositoryStore<T>(selector: (state: RepositoryState) => T): T {
  const store = useRepositoryStoreApi();
  return useStore(store, selector);
}
