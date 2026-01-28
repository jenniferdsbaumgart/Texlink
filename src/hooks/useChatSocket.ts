import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
    id: string;
    orderId: string;
    senderId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposalData?: {
        originalValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        newValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    };
    read: boolean;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        role: string;
    };
}

interface TypingUser {
    userId: string;
    userName: string;
}

interface UseChatSocketOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: string) => void;
}

interface UseChatSocketReturn {
    messages: ChatMessage[];
    isConnected: boolean;
    isLoading: boolean;
    typingUsers: TypingUser[];
    unreadCount: number;
    sendMessage: (data: SendMessageData) => Promise<boolean>;
    sendTyping: (isTyping: boolean) => void;
    markAsRead: () => void;
    acceptProposal: (messageId: string) => Promise<boolean>;
    rejectProposal: (messageId: string) => Promise<boolean>;
    loadMessages: () => Promise<void>;
}

interface SendMessageData {
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    proposedDeadline?: string;
}

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function useChatSocket(
    orderId: string | null,
    options: UseChatSocketOptions = {}
): UseChatSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get auth token
    const getToken = useCallback(() => {
        return localStorage.getItem('token');
    }, []);

    // Initialize socket connection
    useEffect(() => {
        if (!orderId) {
            setMessages([]);
            setIsLoading(false);
            return;
        }

        const token = getToken();
        if (!token) {
            console.error('No auth token available');
            setIsLoading(false);
            return;
        }

        // Create socket connection
        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            console.log('Chat socket connected, waiting for authentication...');
        });

        // Wait for server to confirm authentication before joining room
        socket.on('connected', (data: { userId: string; userName: string }) => {
            console.log('Chat socket authenticated:', data.userName);
            setIsConnected(true);
            options.onConnect?.();

            // Join order room (now that we're authenticated)
            socket.emit('join-order', { orderId }, (response: any) => {
                if (response.success) {
                    setUnreadCount(response.unreadCount || 0);
                } else {
                    console.error('Failed to join order:', response.error);
                    options.onError?.(response.error);
                }
            });

            // Load initial messages
            socket.emit('get-messages', { orderId }, (response: any) => {
                if (response.success) {
                    setMessages(response.messages || []);
                }
                setIsLoading(false);
            });
        });

        socket.on('disconnect', (reason) => {
            console.log('Chat socket disconnected:', reason);
            setIsConnected(false);
            options.onDisconnect?.();
        });

        socket.on('connect_error', (error) => {
            console.error('Chat socket connection error:', error.message);
            setIsLoading(false);
            options.onError?.(error.message);
        });

        socket.on('error', (error: { message: string }) => {
            console.error('Chat socket error:', error.message);
            setIsLoading(false);
            options.onError?.(error.message);
        });

        // Message events
        socket.on('new-message', (message: ChatMessage) => {
            setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        });

        socket.on('messages-read', ({ userId }: { userId: string }) => {
            setMessages((prev) =>
                prev.map((msg) => ({
                    ...msg,
                    read: msg.senderId === userId ? msg.read : true,
                }))
            );
            setUnreadCount(0);
        });

        socket.on('user-typing', (data: TypingUser & { isTyping: boolean }) => {
            setTypingUsers((prev) => {
                if (data.isTyping) {
                    if (prev.some((u) => u.userId === data.userId)) {
                        return prev;
                    }
                    return [...prev, { userId: data.userId, userName: data.userName }];
                } else {
                    return prev.filter((u) => u.userId !== data.userId);
                }
            });
        });

        socket.on('proposal-updated', ({ messageId, status }: { messageId: string; status: string }) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg.id === messageId && msg.proposalData) {
                        return {
                            ...msg,
                            proposalData: {
                                ...msg.proposalData,
                                status: status as 'PENDING' | 'ACCEPTED' | 'REJECTED',
                            },
                        };
                    }
                    return msg;
                })
            );
        });

        // Cleanup
        return () => {
            if (socket.connected) {
                socket.emit('leave-order', { orderId });
            }
            socket.disconnect();
            socketRef.current = null;
        };
    }, [orderId, getToken, options.onConnect, options.onDisconnect, options.onError]);

    // Send message
    const sendMessage = useCallback(
        async (data: SendMessageData): Promise<boolean> => {
            if (!socketRef.current || !orderId) {
                return false;
            }

            return new Promise((resolve) => {
                socketRef.current!.emit(
                    'send-message',
                    { orderId, ...data },
                    (response: any) => {
                        resolve(response.success);
                    }
                );
            });
        },
        [orderId]
    );

    // Send typing indicator
    const sendTyping = useCallback(
        (isTyping: boolean) => {
            if (!socketRef.current || !orderId) return;

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            socketRef.current.emit('typing', { orderId, isTyping });

            // Auto-stop typing after 3 seconds
            if (isTyping) {
                typingTimeoutRef.current = setTimeout(() => {
                    socketRef.current?.emit('typing', { orderId, isTyping: false });
                }, 3000);
            }
        },
        [orderId]
    );

    // Mark messages as read
    const markAsRead = useCallback(() => {
        if (!socketRef.current || !orderId) return;
        socketRef.current.emit('mark-read', { orderId });
        setUnreadCount(0);
    }, [orderId]);

    // Accept proposal
    const acceptProposal = useCallback(
        async (messageId: string): Promise<boolean> => {
            if (!socketRef.current || !orderId) return false;

            return new Promise((resolve) => {
                socketRef.current!.emit(
                    'accept-proposal',
                    { orderId, messageId },
                    (response: any) => {
                        resolve(response.success);
                    }
                );
            });
        },
        [orderId]
    );

    // Reject proposal
    const rejectProposal = useCallback(
        async (messageId: string): Promise<boolean> => {
            if (!socketRef.current || !orderId) return false;

            return new Promise((resolve) => {
                socketRef.current!.emit(
                    'reject-proposal',
                    { orderId, messageId },
                    (response: any) => {
                        resolve(response.success);
                    }
                );
            });
        },
        [orderId]
    );

    // Manual load messages
    const loadMessages = useCallback(async () => {
        if (!socketRef.current || !orderId) return;

        return new Promise<void>((resolve) => {
            socketRef.current!.emit('get-messages', { orderId }, (response: any) => {
                if (response.success) {
                    setMessages(response.messages || []);
                }
                resolve();
            });
        });
    }, [orderId]);

    return {
        messages,
        isConnected,
        isLoading,
        typingUsers,
        unreadCount,
        sendMessage,
        sendTyping,
        markAsRead,
        acceptProposal,
        rejectProposal,
        loadMessages,
    };
}
