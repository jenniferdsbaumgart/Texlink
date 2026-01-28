import { useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
    id: string;
    orderId: string;
    senderId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposalData?: any;
    read: boolean;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        role: string;
    };
}

export function useInfiniteMessages(
    orderId: string,
    socket: Socket | null
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const oldestCursor = useRef<string | null>(null);

    const loadInitial = useCallback(() => {
        if (!socket) return;

        setIsInitialLoading(true);

        socket.emit('get-messages', {
            orderId,
            limit: 50,
        }, (response: any) => {
            if (response.success) {
                setMessages(response.messages);
                setHasMore(response.hasMore);
                oldestCursor.current = response.messages.length > 0
                    ? response.messages[0].id
                    : null;
            }
            setIsInitialLoading(false);
        });
    }, [orderId, socket]);

    const loadMore = useCallback(() => {
        if (!socket || isLoadingMore || !hasMore || !oldestCursor.current) return;

        setIsLoadingMore(true);

        socket.emit('get-messages', {
            orderId,
            limit: 50,
            cursor: oldestCursor.current,
            direction: 'before',
        }, (response: any) => {
            if (response.success) {
                // Adicionar mensagens antigas no início
                setMessages(prev => [...response.messages, ...prev]);
                setHasMore(response.hasMore);
                oldestCursor.current = response.messages.length > 0
                    ? response.messages[0].id
                    : oldestCursor.current;
            }
            setIsLoadingMore(false);
        });
    }, [orderId, socket, isLoadingMore, hasMore]);

    const addNewMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => {
            // Evitar duplicatas
            if (prev.some(m => m.id === message.id)) {
                return prev;
            }
            return [...prev, message];
        });
    }, []);

    const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
        ));
    }, []);

    return {
        messages,
        hasMore,
        isLoadingMore,
        isInitialLoading,
        loadInitial,
        loadMore,
        addNewMessage,
        updateMessage,
        setMessages,
    };
}
