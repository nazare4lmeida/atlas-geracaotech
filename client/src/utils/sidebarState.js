import { useCallback, useEffect, useState } from 'react';

// Preferência de visualização do próprio aluno (recolher o menu). Se o navegador bloquear o armazenamento, vale o padrão.
const KEY = 'atlas-sidebar-collapsed';
const EVENT = 'atlas-sidebar-change';

function read() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(read);

  useEffect(() => {
    const sync = () => setCollapsedState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setCollapsed = useCallback((value) => {
    try {
      localStorage.setItem(KEY, value ? '1' : '0');
    } catch {
      // sem armazenamento: a preferência vale só nesta tela
    }
    setCollapsedState(value);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [collapsed, setCollapsed];
}
