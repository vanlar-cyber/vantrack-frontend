import { useState, useEffect, useCallback } from 'react';
import { messagesApi, MessageResponse } from '../services/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  drafts?: DraftTransaction[];
  attachments?: Attachment[];
}

export interface DraftTransaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: string;
  account: string;
  contact?: string;
  contactId?: string;
  dueDate?: string;
  linkedTransactionId?: string;
  actionStatus: 'pending' | 'confirmed' | 'discarded';
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio';
  mimeType: string;
  dataUrl: string;
  name?: string;
  durationMs?: number;
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await messagesApi.list(0, 500);
      const mapped = response.messages.map((m: MessageResponse) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        drafts: m.drafts_json as DraftTransaction[] | undefined,
        attachments: m.attachments_json as Attachment[] | undefined,
      }));
      setMessages(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addMessage = async (role: 'user' | 'assistant', content: string, attachments?: Attachment[]) => {
    const apiAttachments = attachments?.map(a => ({
      id: a.id,
      type: a.type,
      mime_type: a.mimeType,
      data_url: a.dataUrl,
      name: a.name,
      duration_ms: a.durationMs,
    }));
    
    await messagesApi.create({ role, content, attachments: apiAttachments });
    await fetchMessages();
  };

  const clearMessages = async () => {
    await messagesApi.clear();
    setMessages([]);
  };

  // Local state management for drafts (not persisted to backend)
  const addLocalMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  return {
    messages,
    isLoading,
    error,
    refresh: fetchMessages,
    addMessage,
    clearMessages,
    addLocalMessage,
    setMessages,
  };
}
