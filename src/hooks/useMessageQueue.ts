import { useState, useEffect, useCallback } from 'react';
import { chatDb, PendingMessage } from '../db/chat-db';

interface UseMessageQueueOptions {
  orderId: string;
  onSendSuccess?: (message: any) => void;
  onSendError?: (error: string) => void;
}

export function useMessageQueue(options: UseMessageQueueOptions) {
  const { orderId, onSendSuccess, onSendError } = options;
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Carregar contagem de pendentes
  const loadPendingCount = useCallback(async () => {
    if (!orderId) {
      setPendingCount(0);
      return;
    }

    try {
      const count = await chatDb.pendingMessages
        .where({ orderId, status: 'pending' })
        .count();
      setPendingCount(count);
    } catch (error) {
      console.error('Error loading pending count:', error);
      setPendingCount(0);
    }
  }, [orderId]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  // Adicionar mensagem à queue
  const queueMessage = useCallback(
    async (data: Omit<PendingMessage, 'id' | 'timestamp' | 'retryCount' | 'status'>) => {
      const message: PendingMessage = {
        ...data,
        id: `temp-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      await chatDb.pendingMessages.add(message);
      await loadPendingCount();

      return message.id;
    },
    [loadPendingCount]
  );

  // Processar queue (tentar enviar mensagens pendentes)
  const processQueue = useCallback(
    async (sendFunction: (data: any) => Promise<boolean>) => {
      if (isProcessing || !orderId) return;

      setIsProcessing(true);

      try {
        const pending = await chatDb.pendingMessages
          .where({ orderId, status: 'pending' })
          .sortBy('timestamp');

        for (const msg of pending) {
          try {
            // Marcar como "sending"
            await chatDb.pendingMessages.update(msg.id, { status: 'sending' });

            // Tentar enviar
            const success = await sendFunction({
              type: msg.type,
              content: msg.content,
              proposedPrice: msg.proposedPrice,
              proposedQuantity: msg.proposedQuantity,
              proposedDeadline: msg.proposedDeadline,
            });

            if (success) {
              // Sucesso - remover da queue
              await chatDb.pendingMessages.delete(msg.id);
              onSendSuccess?.(msg);
            } else {
              // Falha - incrementar retry
              const newRetryCount = msg.retryCount + 1;

              if (newRetryCount >= 3) {
                // Após 3 tentativas, marcar como failed
                await chatDb.pendingMessages.update(msg.id, {
                  status: 'failed',
                  retryCount: newRetryCount,
                  error: 'Max retries exceeded',
                });
                onSendError?.(`Failed to send message after 3 attempts`);
              } else {
                // Voltar para pending para tentar depois
                await chatDb.pendingMessages.update(msg.id, {
                  status: 'pending',
                  retryCount: newRetryCount,
                });
              }
            }
          } catch (error: any) {
            console.error('Error processing queued message:', error);
            await chatDb.pendingMessages.update(msg.id, {
              status: 'pending', // Tentar novamente
              error: error.message,
            });
          }
        }

        await loadPendingCount();
      } finally {
        setIsProcessing(false);
      }
    },
    [orderId, isProcessing, loadPendingCount, onSendSuccess, onSendError]
  );

  // Limpar mensagens antigas (> 7 dias)
  const cleanupOld = useCallback(async () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await chatDb.pendingMessages
      .where('timestamp')
      .below(weekAgo)
      .delete();
  }, []);

  // Obter mensagens falhadas
  const getFailedMessages = useCallback(async () => {
    if (!orderId) return [];
    return chatDb.pendingMessages
      .where({ orderId, status: 'failed' })
      .toArray();
  }, [orderId]);

  // Retentar mensagem falhada
  const retryFailed = useCallback(async (messageId: string) => {
    await chatDb.pendingMessages.update(messageId, {
      status: 'pending',
      retryCount: 0,
      error: undefined,
    });
    await loadPendingCount();
  }, [loadPendingCount]);

  return {
    pendingCount,
    isProcessing,
    queueMessage,
    processQueue,
    cleanupOld,
    getFailedMessages,
    retryFailed,
  };
}
