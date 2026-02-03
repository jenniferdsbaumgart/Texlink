import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /** The key to listen for (e.g., 'k', 'Escape', 'Enter') */
  key: string;
  /** Whether Ctrl (or Cmd on Mac) should be pressed */
  ctrl?: boolean;
  /** Whether Shift should be pressed */
  shift?: boolean;
  /** Whether Alt should be pressed */
  alt?: boolean;
  /** Whether Meta (Cmd on Mac, Windows key on Windows) should be pressed */
  meta?: boolean;
  /** The callback to execute when the shortcut is triggered */
  callback: (event: KeyboardEvent) => void;
  /** Prevent the default action (default: true) */
  preventDefault?: boolean;
  /** Stop event propagation (default: false) */
  stopPropagation?: boolean;
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Ignore when focus is in an input/textarea (default: true) */
  ignoreInputs?: boolean;
}

const INPUT_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT'];

function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  return (
    INPUT_ELEMENTS.includes(element.tagName) ||
    element.getAttribute('contenteditable') === 'true'
  );
}

/**
 * Hook for handling keyboard shortcuts
 *
 * @example
 * ```tsx
 * // Single shortcut
 * useKeyboardShortcut({
 *   key: 'k',
 *   ctrl: true,
 *   callback: () => setSearchOpen(true),
 * });
 *
 * // Multiple shortcuts
 * useKeyboardShortcut([
 *   { key: 'Escape', callback: () => setModalOpen(false) },
 *   { key: 'n', ctrl: true, callback: () => createNew() },
 * ]);
 * ```
 */
export function useKeyboardShortcut(
  shortcuts: KeyboardShortcut | KeyboardShortcut[]
) {
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const activeShortcuts = shortcutsRef.current;

    for (const shortcut of activeShortcuts) {
      const {
        key,
        ctrl = false,
        shift = false,
        alt = false,
        meta = false,
        callback,
        preventDefault = true,
        stopPropagation = false,
        enabled = true,
        ignoreInputs = true,
      } = shortcut;

      // Skip if disabled
      if (!enabled) continue;

      // Skip if focus is in an input element (unless explicitly allowed)
      if (ignoreInputs && isInputElement(document.activeElement)) continue;

      // Check key match (case-insensitive for letter keys)
      const keyMatch =
        event.key.toLowerCase() === key.toLowerCase() ||
        event.code.toLowerCase() === `key${key.toLowerCase()}`;

      if (!keyMatch) continue;

      // Check modifier keys
      // Support both Ctrl and Meta (Cmd) for cross-platform compatibility
      const ctrlOrMeta = ctrl && (event.ctrlKey || event.metaKey);
      const metaOnly = meta && event.metaKey;

      const modifiersMatch =
        (ctrl ? ctrlOrMeta : !event.ctrlKey || meta) &&
        (meta ? metaOnly || ctrlOrMeta : !event.metaKey || ctrl) &&
        (shift ? event.shiftKey : !event.shiftKey) &&
        (alt ? event.altKey : !event.altKey);

      if (!modifiersMatch) continue;

      // Execute callback
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      callback(event);
      return; // Only execute the first matching shortcut
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Hook for handling Escape key to close modals/drawers
 *
 * @example
 * ```tsx
 * useEscapeKey(() => setOpen(false), { enabled: isOpen });
 * ```
 */
export function useEscapeKey(
  callback: () => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  useKeyboardShortcut({
    key: 'Escape',
    callback,
    enabled,
    ignoreInputs: false, // Allow Escape even in inputs
  });
}

/**
 * Hook for common shortcuts pattern (Ctrl/Cmd + Key)
 *
 * @example
 * ```tsx
 * useCtrlKey('s', handleSave);
 * useCtrlKey('k', openSearch);
 * ```
 */
export function useCtrlKey(
  key: string,
  callback: () => void,
  options: { enabled?: boolean; shift?: boolean } = {}
) {
  const { enabled = true, shift = false } = options;

  useKeyboardShortcut({
    key,
    ctrl: true,
    shift,
    callback,
    enabled,
  });
}

export default useKeyboardShortcut;
