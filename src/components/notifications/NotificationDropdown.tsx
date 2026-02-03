import React, { useRef, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Loader2, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
}

export function NotificationDropdown({ isOpen, onClose, anchorRef }: NotificationDropdownProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    // Get notifications page route based on user role
    const notificationsRoute = useMemo(() => {
        switch (user?.role) {
            case 'SUPPLIER': return '/portal/notificacoes';
            case 'BRAND': return '/brand/notificacoes';
            case 'ADMIN': return '/admin/notificacoes';
            default: return '/portal/notificacoes';
        }
    }, [user?.role]);

    // Calculate dropdown position based on anchor
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const dropdownWidth = 384; // w-96 = 24rem = 384px

            // Calculate left position, ensuring it doesn't go off-screen
            let left = rect.left;
            if (left + dropdownWidth > window.innerWidth) {
                left = window.innerWidth - dropdownWidth - 16; // 16px padding
            }
            if (left < 16) {
                left = 16;
            }

            setPosition({
                top: rect.bottom + 8, // 8px gap
                left: left,
            });
        }
    }, [isOpen, anchorRef]);

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    // Handle scroll for infinite loading
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading) {
            fetchNotifications();
        }
    };

    if (!isOpen) return null;

    // Use portal to render at body level, outside any stacking context
    return createPortal(
        <div
            ref={dropdownRef}
            style={{ top: position.top, left: position.left }}
            className="fixed w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[99999] overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Notificações
                    </h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            {/* Notification list */}
            <div
                className="max-h-96 overflow-y-auto"
                onScroll={handleScroll}
            >
                {notifications.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Nenhuma notificação
                        </p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={markAsRead}
                                onClose={onClose}
                            />
                        ))}
                        {isLoading && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                    <button
                        onClick={() => {
                            navigate(notificationsRoute);
                            onClose();
                        }}
                        className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        Ver todas as notificações
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
}

export default NotificationDropdown;
