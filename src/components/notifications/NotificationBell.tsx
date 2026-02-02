import React, { useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { unreadCount, isConnected } = useNotifications();

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const closeDropdown = () => {
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                onClick={toggleDropdown}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors"
                title="Notificações"
            >
                <Bell className={`h-5 w-5 ${isConnected ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`} />

                {/* Unread count badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {/* Offline indicator */}
                {!isConnected && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full border border-white dark:border-gray-800" />
                )}
            </button>

            <NotificationDropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                anchorRef={buttonRef}
            />
        </div>
    );
}

export default NotificationBell;
