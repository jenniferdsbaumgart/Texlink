// Hooks Library
// TEXLINK Facção Manager

// Accessibility Hooks
export { useFocusTrap, type UseFocusTrapOptions } from './useFocusTrap';
export {
  useKeyboardShortcut,
  useEscapeKey,
  useCtrlKey,
  type KeyboardShortcut,
} from './useKeyboardShortcut';

// Chat & Messaging Hooks
export { useChatSocket } from './useChatSocket';
export { useInfiniteMessages } from './useInfiniteMessages';
export { useMessageQueue } from './useMessageQueue';

// Network & Real-time Hooks
export { useNetworkStatus } from './useNetworkStatus';
export { useNotificationSocket } from './useNotificationSocket';

// Feature Hooks
export { usePermissions } from './usePermissions';
export { useTemplates } from './useTemplates';
