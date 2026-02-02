import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    CheckCircle,
    XCircle,
    RefreshCw,
    FileText,
    MessageCircle,
    Clock,
    CheckSquare,
    MessageSquare,
    Bell,
    Send,
    UserCheck,
    Award,
    FileWarning,
    FileX,
    CreditCard,
    DollarSign,
    AlertTriangle,
    HelpCircle,
    Activity,
    UserPlus,
    Users,
    Star,
    Megaphone,
    LucideIcon,
} from 'lucide-react';
import { AppNotification, NotificationType, NotificationPriority, getTimeAgo } from '../../types/notification.types';

interface NotificationItemProps {
    notification: AppNotification;
    onMarkAsRead: (id: string) => void;
    onClose?: () => void;
}

const ICON_MAP: Record<NotificationType, LucideIcon> = {
    ORDER_CREATED: Package,
    ORDER_ACCEPTED: CheckCircle,
    ORDER_REJECTED: XCircle,
    ORDER_STATUS_CHANGED: RefreshCw,
    ORDER_PROPOSAL_RECEIVED: FileText,
    ORDER_PROPOSAL_RESPONDED: MessageCircle,
    ORDER_DEADLINE_APPROACHING: Clock,
    ORDER_FINALIZED: CheckSquare,
    MESSAGE_RECEIVED: MessageSquare,
    MESSAGE_UNREAD_REMINDER: Bell,
    CREDENTIAL_INVITE_SENT: Send,
    CREDENTIAL_STATUS_CHANGED: UserCheck,
    CREDENTIAL_COMPLETED: Award,
    DOCUMENT_EXPIRING: FileWarning,
    DOCUMENT_EXPIRED: FileX,
    PAYMENT_REGISTERED: CreditCard,
    PAYMENT_RECEIVED: DollarSign,
    PAYMENT_OVERDUE: AlertTriangle,
    TICKET_CREATED: HelpCircle,
    TICKET_MESSAGE_ADDED: MessageCircle,
    TICKET_STATUS_CHANGED: Activity,
    RELATIONSHIP_REQUESTED: UserPlus,
    RELATIONSHIP_STATUS_CHANGED: Users,
    RATING_RECEIVED: Star,
    SYSTEM_ANNOUNCEMENT: Megaphone,
};

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    NORMAL: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
    const navigate = useNavigate();
    const Icon = ICON_MAP[notification.type] || Bell;
    const priorityStyle = PRIORITY_STYLES[notification.priority];

    const handleClick = () => {
        // Mark as read
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }

        // Navigate to action URL if available
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            onClose?.();
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`
                flex items-start gap-3 p-3 cursor-pointer transition-colors
                ${notification.read
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-blue-50 dark:bg-blue-900/10'
                }
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                border-b border-gray-100 dark:border-gray-700 last:border-b-0
            `}
        >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${priorityStyle}`}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${notification.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-white'}`}>
                        {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {getTimeAgo(notification.createdAt)}
                    </span>
                </div>
                <p className={`text-sm mt-0.5 line-clamp-2 ${notification.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {notification.body}
                </p>
            </div>

            {/* Unread indicator */}
            {!notification.read && (
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full" />
            )}
        </div>
    );
}

export default NotificationItem;
