'use client';

import { useEffect, useState } from 'react';

/**
 * True while the on-screen keyboard is (almost certainly) open. On touch
 * devices the soft keyboard appears whenever a text field is focused, so we
 * track focus of inputs/textareas/contenteditable. Never fires on desktop
 * (fine pointer) where focusing a field doesn't open a keyboard. Used to hide
 * the bottom nav so it doesn't wedge above the keyboard.
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;

    const isField = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable);
    };

    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const onIn = (e: FocusEvent) => {
      if (isField(e.target)) {
        clearTimeout(closeTimer);
        setOpen(true);
      }
    };
    // Settle briefly so moving between fields doesn't flicker the nav back.
    const onOut = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setOpen(false), 150);
    };

    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      clearTimeout(closeTimer);
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  return open;
}
