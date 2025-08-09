import { useState } from 'react';
import { getApiUrl, API_CONFIG } from '@/config/api';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  images?: string[];
}

export interface ChatResponse {
  query: string;
  summary: string;
  images: string[];
  success: boolean;
  error?: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hello! I'm your NFT market analysis assistant. Ask me about NFT trends, market insights, or specific projects!",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.summary,
        isUser: false,
        timestamp: new Date(),
        images: data.images,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting to the server right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        id: '1',
        content: "Hello! I'm your NFT market analysis assistant. Ask me about NFT trends, market insights, or specific projects!",
        isUser: false,
        timestamp: new Date(),
      }
    ]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
};
