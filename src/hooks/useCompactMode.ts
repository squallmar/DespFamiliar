import { useState, useEffect } from 'react';

export function useCompactMode() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    // Carregar preferência do localStorage
    const saved = localStorage.getItem('compactMode');
    if (saved !== null) {
      setIsCompact(JSON.parse(saved));
    }
  }, []);

  const toggleCompact = () => {
    const newValue = !isCompact;
    setIsCompact(newValue);
    localStorage.setItem('compactMode', JSON.stringify(newValue));
    // Dispatch event para componentes reagirem
    const event = new CustomEvent('compactModeChange', { detail: newValue });
    window.dispatchEvent(event);
  };

  return { isCompact, toggleCompact };
}
