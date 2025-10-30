'use client';

import { useState, useRef, useEffect } from 'react';
import { useUserStore } from '@/hooks/user-info-status';
import Image from 'next/image';
import GFLogo from '../assets/images/GFLogo.png';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  image?: string; // Base64 image data or URL
  imageFile?: File; // File object for uploads
}

interface ChatSession {
  sessionId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatTitle, setCurrentChatTitle] = useState<string>('');
  const [isNewSession, setIsNewSession] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  
  // Get user profile info
  const { profilePicture, isAuthenticated } = useUserStore();

  // Sample prompts pool
  const allPrompts = [
    "What factories do you recommend for producing leather handbags in Italy?",
    "Can you find me a garment factory with low MOQ for a start-up brand?",
    "I need sneaker manufacturers in Portugal. What options are available?",
    "Help me find accessory factories that can handle custom packaging.",
    "What is the typical lead time for dyeing and washing services?",
    "Can you suggest factories that specialize in eco-friendly trims?",
    "I'm looking for a factory in Spain that produces embellished garments.",
    "What should I include in a tech pack for a fashion accessory?",
    "Find me factories offering small-batch production under 500 units.",
    "Which factories can produce custom sneaker soles?",
    "I want to produce scarves with unique prints. Where should I look?",
    "Do you have recommendations for factories with fast turnaround for samples?",
    "What are the price ranges for MOQ in garment factories in France?",
    "Can you advise on factories that accept a basic reference image instead of a tech pack?",
    "I'm interested in factories near Italy but outside the country for leather goods. What do you suggest?"
  ];

  // Function to get 4 random prompts
  const getRandomPrompts = () => {
    const shuffled = [...allPrompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  };

  // State for random prompts (initialized once)
  const [randomPrompts] = useState(() => getRandomPrompts());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    // Load dark mode preference
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('glassfactory-dark-mode');
      if (savedDarkMode !== null) {
        setIsDarkMode(JSON.parse(savedDarkMode));
      } else {
        // Default to system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
      }
    }
    
    // Load chat history first
    const loadedHistory = loadChatHistory();
    setChatHistory(loadedHistory);
    
    // Get or create persistent session ID using localStorage
    let persistentSessionId = '';
    if (typeof window !== 'undefined') {
      persistentSessionId = localStorage.getItem('n8n-chat-session') || '';
      if (!persistentSessionId) {
        persistentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('n8n-chat-session', persistentSessionId);
        setIsNewSession(true);
      } else {
        // Check if this session exists in history
        const existingSession = loadedHistory.find(chat => chat.sessionId === persistentSessionId);
        if (existingSession) {
          setMessages(existingSession.messages);
          setCurrentChatTitle(existingSession.title);
          setIsNewSession(false);
        } else {
          setIsNewSession(true);
        }
      }
    }
    setSessionId(persistentSessionId);
    
    // Add initial message only for new sessions
    if (!messages.length) {
      setMessages([{
        id: '1',
        text: "Hello! I'm your Glass Factory assistant. How can I help you with your manufacturing needs today?",
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, []);

  // Save chat when messages change
  useEffect(() => {
    if (messages.length > 1) { // Don't save just the initial greeting
      saveCurrentChat();
    }
  }, [messages]);

  const sendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading || !sessionId) return;

    let imageBase64 = null;
    if (selectedImage) {
      try {
        imageBase64 = await convertImageToBase64(selectedImage);
      } catch (error) {
        console.error('Error converting image:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
      image: imageBase64 || undefined,
      imageFile: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    removeImage();
    setIsLoading(true);

    // Scroll to show the user's message immediately after sending
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
          const container = messagesContainerRef.current;
          container.scrollTop = container.scrollHeight;
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 50);

    try {
      console.log('Sending message with sessionId:', sessionId, 'isNewSession:', isNewSession);
      const requestBody: any = { 
        message: inputValue,
        sessionId: sessionId,
        isNewSession: isNewSession,
        userProfile: {
          // Add user profile data from user store if available
          isAuthenticated: isAuthenticated
        }
      };

      if (imageBase64) {
        requestBody.image = imageBase64;
      }

      // Reset new session flag after first message
      if (isNewSession) {
        setIsNewSession(false);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "Sorry, I couldn't process that request.",
        isUser: false,
        timestamp: new Date()
      };

      // Add the message to state first
      setMessages(prev => [...prev, botMessage]);
      
      // Start typing effect for the bot message
      startTypingEffect(botMessage.id, botMessage.text);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        console.log('Base64 conversion complete:');
        console.log('File name:', file.name);
        console.log('File size:', file.size);
        console.log('File type:', file.type);
        console.log('Base64 length:', result.length);
        console.log('Base64 starts with:', result.substring(0, 50));
        console.log('Has proper data URL format:', result.startsWith('data:'));
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Chat history persistence functions
  const saveChatHistory = (history: ChatSession[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('glassfactory-chat-history', JSON.stringify(history));
    }
  };

  const loadChatHistory = (): ChatSession[] => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('glassfactory-chat-history');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          return parsed.map((chat: any) => ({
            ...chat,
            timestamp: new Date(chat.timestamp),
            messages: chat.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
        } catch (error) {
          console.error('Error parsing chat history:', error);
          return [];
        }
      }
    }
    return [];
  };

  const generateChatTitle = (firstMessage: string): string => {
    if (!firstMessage) return 'New Chat';
    // Take first 30 characters and remove any line breaks
    const title = firstMessage.replace(/\n/g, ' ').slice(0, 30);
    return title.length < firstMessage.length ? title + '...' : title;
  };

  const saveCurrentChat = () => {
    if (messages.length === 0 || !sessionId) return;
    
    const lastMessage = messages[messages.length - 1];
    const firstUserMessage = messages.find(m => m.isUser && m.text.trim());
    const title = currentChatTitle || (firstUserMessage ? generateChatTitle(firstUserMessage.text) : 'New Chat');
    
    const chatSession: ChatSession = {
      sessionId,
      title,
      lastMessage: lastMessage.text || '[Image]',
      timestamp: new Date(),
      messages: [...messages]
    };

    // Find if this session already exists in history
    const existingIndex = chatHistory.findIndex(chat => chat.sessionId === sessionId);
    
    if (existingIndex !== -1) {
      // Update existing chat in place to preserve position
      const updatedHistory = [...chatHistory];
      updatedHistory[existingIndex] = chatSession;
      setChatHistory(updatedHistory);
      saveChatHistory(updatedHistory);
    } else {
      // New chat, add to beginning
      const updatedHistory = [chatSession, ...chatHistory];
      setChatHistory(updatedHistory);
      saveChatHistory(updatedHistory);
    }
    
    if (!currentChatTitle) {
      setCurrentChatTitle(title);
    }
  };

  // Session management functions
  const startNewChat = () => {
    // Save current chat first
    if (messages.length > 0) {
      saveCurrentChat();
    }
    
    // Create new session
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([{
      id: '1',
      text: "Hello! I'm your Glass Factory assistant. How can I help you with your manufacturing needs today?",
      isUser: false,
      timestamp: new Date()
    }]);
    setCurrentChatTitle('');
    setIsNewSession(true);
    
    // Store new session ID
    if (typeof window !== 'undefined') {
      localStorage.setItem('n8n-chat-session', newSessionId);
    }
    
    // Close mobile sidebar
    setIsMobileSidebarOpen(false);
  };

  const loadChatSession = (selectedSessionId: string) => {
    // Save current chat first
    if (messages.length > 0 && sessionId !== selectedSessionId) {
      saveCurrentChat();
    }
    
    const chatSession = chatHistory.find(chat => chat.sessionId === selectedSessionId);
    if (chatSession) {
      setSessionId(selectedSessionId);
      setMessages(chatSession.messages);
      setCurrentChatTitle(chatSession.title);
      setIsNewSession(false);
      
      // Update stored session ID
      if (typeof window !== 'undefined') {
        localStorage.setItem('n8n-chat-session', selectedSessionId);
      }
      
      // Close mobile sidebar
      setIsMobileSidebarOpen(false);
    }
  };

  const deleteChatSession = (sessionIdToDelete: string) => {
    const updatedHistory = chatHistory.filter(chat => chat.sessionId !== sessionIdToDelete);
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);
    
    // If deleting current session, start new chat
    if (sessionId === sessionIdToDelete) {
      startNewChat();
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('glassfactory-dark-mode', JSON.stringify(newDarkMode));
    }
  };

  const checkIfUserScrolledUp = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Increase threshold for mobile devices due to different scrolling behavior
      const isMobile = window.innerWidth < 768;
      const threshold = isMobile ? 50 : 10; // Larger threshold for mobile
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      userScrolledUp.current = !isAtBottom;
    }
  };

  const startTypingEffect = (messageId: string, fullText: string) => {
    // Clear any existing typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    setTypingMessageId(messageId);
    setDisplayedText('');
    userScrolledUp.current = false; // Reset scroll state when typing starts
    
    // Split text into words for word-by-word typing
    const words = fullText.split(' ');
    let currentWordIndex = 0;
    const typingSpeed = 80; // milliseconds per word
    
    typingIntervalRef.current = setInterval(() => {
      if (currentWordIndex < words.length) {
        // Build display text with current words
        const wordsToShow = words.slice(0, currentWordIndex + 1);
        setDisplayedText(wordsToShow.join(' '));
        currentWordIndex++;
        
        // Only auto-scroll if user hasn't scrolled up
        if (!userScrolledUp.current && messagesContainerRef.current) {
          // Use different scrolling approach for mobile vs desktop
          const isMobile = window.innerWidth < 768;
          
          if (isMobile) {
            // For mobile, use scrollTop directly with a small delay
            setTimeout(() => {
              if (messagesContainerRef.current) {
                const container = messagesContainerRef.current;
                container.scrollTop = container.scrollHeight;
              }
            }, 20);
          } else {
            // For desktop, use scrollIntoView
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 10);
          }
        }
      } else {
        // Typing complete
        clearInterval(typingIntervalRef.current!);
        setTypingMessageId(null);
        setDisplayedText('');
        
        // Final scroll only if user hasn't scrolled up
        if (!userScrolledUp.current && messagesContainerRef.current) {
          const isMobile = window.innerWidth < 768;
          
          if (isMobile) {
            setTimeout(() => {
              if (messagesContainerRef.current) {
                const container = messagesContainerRef.current;
                container.scrollTop = container.scrollHeight;
              }
            }, 50);
          } else {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      }
    }, typingSpeed);
  };

  // Cleanup typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* SVG Filter for Glass Effect */}
      <svg className="hidesvg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="svgmode" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      <style jsx>{`
        :global(:root) {
          --c-glass: #9ca3af;
          --c-light: #fff;
          --c-dark: #000;
          --glass-reflex-dark: 0.8;
          --glass-reflex-light: 0.8;
          --saturation: 120%;
        }

        .hidesvg {
          position: fixed;
          width: 1px;
          height: 1px;
          top: 0;
          left: 0;
        }

        :global(.glass-bubble) {
          box-sizing: border-box;
          border: none;
          border-radius: 12px;
          background-color: color-mix(in srgb, var(--c-light) 1%, transparent);
          box-shadow: 
            /* Outer border light effect */
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 15%), transparent),
            
            /* Top edge highlight (light from above) */
            inset 0 2px 4px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent),
            
            /* Left edge highlight */
            inset 2px 0 4px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 40%), transparent),
            
            /* Bottom edge shadow */
            inset 0 -2px 6px -1px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 8%), transparent),
            
            /* Right edge shadow */
            inset -2px 0 6px -1px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 5%), transparent),
            
            /* Inner glow for depth */
            inset 0 0 20px 0 color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 4%), transparent),
            
            /* Outer drop shadow */
            0 4px 12px 0 color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 4%), transparent),
            0 2px 4px 0 color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 6%), transparent);
            
          backdrop-filter: blur(3px) saturate(120%);
          -webkit-backdrop-filter: blur(3px) saturate(120%);
          transition: background-color 400ms cubic-bezier(1, 0, 0.4, 1),
            box-shadow 400ms cubic-bezier(1, 0, 0.4, 1);
        }

        @supports (-webkit-backdrop-filter: blur(0)) and (not (backdrop-filter: url(#x))) {
          :global(.glass-bubble) {
            backdrop-filter: blur(8px) saturate(130%) !important;
            -webkit-backdrop-filter: blur(8px) saturate(130%) !important;
          }
        }

        @-moz-document url-prefix() {
          :global(.glass-bubble) {
            backdrop-filter: blur(8px) saturate(130%) !important;
            -webkit-backdrop-filter: blur(8px) saturate(130%) !important;
          }
        }

        /* Dark mode glass bubble */
        :global(.glass-bubble-dark) {
          box-sizing: border-box;
          border: none;
          border-radius: 12px;
          background-color: color-mix(in srgb, #374151 3%, transparent);
          box-shadow: 
            /* Outer border light effect */
            inset 0 0 0 1px color-mix(in srgb, #6b7280 25%, transparent),
            
            /* Top edge highlight (light from above) */
            inset 0 2px 4px -1px color-mix(in srgb, #9ca3af 90%, transparent),
            
            /* Left edge highlight */
            inset 2px 0 4px -1px color-mix(in srgb, #9ca3af 70%, transparent),
            
            /* Bottom edge shadow */
            inset 0 -2px 6px -1px color-mix(in srgb, #000 15%, transparent),
            
            /* Right edge shadow */
            inset -2px 0 6px -1px color-mix(in srgb, #000 10%, transparent),
            
            /* Inner glow for depth */
            inset 0 0 20px 0 color-mix(in srgb, #6b7280 8%, transparent),
            
            /* Outer drop shadow */
            0 4px 12px 0 color-mix(in srgb, #000 20%, transparent),
            0 2px 4px 0 color-mix(in srgb, #000 30%, transparent);
            
          backdrop-filter: blur(6px) saturate(110%);
          -webkit-backdrop-filter: blur(6px) saturate(110%);
          transition: background-color 400ms cubic-bezier(1, 0, 0.4, 1),
            box-shadow 400ms cubic-bezier(1, 0, 0.4, 1);
        }

        /* Hide scrollbar for horizontal scroll */
        :global(.scrollbar-hide) {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer 10+ */
        }

        :global(.scrollbar-hide::-webkit-scrollbar) {
          display: none; /* WebKit */
        }

        /* iOS specific viewport fixes */
        :global(html) {
          height: 100%;
          height: 100vh;
          height: 100dvh;
          -webkit-text-size-adjust: 100%;
        }

        :global(body) {
          height: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          -webkit-overflow-scrolling: touch;
          position: fixed;
          width: 100%;
        }

        /* Chat container mobile fixes */
        :global(.chat-container) {
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          position: relative;
          overflow: hidden;
        }

        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          :global(.chat-container) {
            height: -webkit-fill-available;
            max-height: -webkit-fill-available;
          }
        }

        /* Mobile safe area support - iOS specific */
        @supports (padding: max(0px)) {
          :global(.mobile-safe-top) {
            padding-top: max(1rem, env(safe-area-inset-top)) !important;
          }
          
          :global(.mobile-safe-bottom) {
            padding-bottom: max(1rem, env(safe-area-inset-bottom)) !important;
          }
        }

        /* iOS input zoom prevention */
        @media screen and (max-width: 767px) {
          :global(input[type="text"]) {
            font-size: 16px !important;
            -webkit-appearance: none;
            border-radius: 0;
          }
        }
      `}</style>

      {/* Full Screen Layout */}
      <div className={`chat-container w-full min-h-screen flex overflow-hidden transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-gray-200 to-gray-300'
      }`} style={{ height: '100vh', height: '100dvh' }}>
        {/* Mobile Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div className={`w-80 backdrop-blur-sm border-r flex flex-col transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800/80 border-gray-700/50' 
            : 'bg-white/80 border-gray-200/50'
        } ${
          isMobileSidebarOpen 
            ? 'fixed inset-y-0 left-0 z-50 md:relative md:left-0' 
            : 'fixed inset-y-0 -left-80 z-50 md:relative md:left-0'
        } md:flex`}>
          {/* Sidebar Header */}
          <div className={`p-6 border-b transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <Image
                src={GFLogo}
                alt="Glass Factory Logo"
                width={120}
                height={32}
                className={`select-none transition-all duration-300 ${isDarkMode ? 'invert' : ''}`}
              />
              <div className="flex items-center gap-2">
                {/* Close button for mobile */}
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`md:hidden p-2 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <h1 className={`text-xl font-semibold mt-3 font-inter-tight transition-colors duration-300 ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Glass Factory
            </h1>
            <p className={`text-sm mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Find and connect with the best clothing factories in the world.
            </p>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* New Chat Button */}
            <div className={`p-4 border-b transition-colors duration-300 ${
              isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            }`}>
              <button
                onClick={startNewChat}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.background = `radial-gradient(circle at ${x}px ${y}px, #0015ff 0%, #000d99 100%)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #0015ff 0%, #000d99 81.25%)';
                }}
                className="w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2 text-white"
                style={{ background: 'linear-gradient(90deg, #0015ff 0%, #000d99 81.25%)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className={`text-sm font-medium mb-3 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Chat History
                </h3>
                <div className="space-y-2">
                  {chatHistory.length === 0 ? (
                    <div className={`text-sm text-center py-8 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      No previous chats
                    </div>
                  ) : (
                    chatHistory.map((chat) => (
                      <div
                        key={chat.sessionId}
                        className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          chat.sessionId === sessionId
                            ? isDarkMode 
                              ? 'bg-blue-900/50 border border-blue-700/50'
                              : 'bg-blue-50 border border-blue-200'
                            : isDarkMode
                              ? 'hover:bg-gray-700/50 border border-transparent'
                              : 'hover:bg-gray-50 border border-transparent'
                        }`}
                        onClick={() => loadChatSession(chat.sessionId)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                              {chat.title}
                            </p>
                            <p className={`text-xs mt-1 truncate transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {chat.lastMessage}
                            </p>
                            <p className={`text-xs mt-1 transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {chat.timestamp.toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(chat.sessionId);
                            }}
                            className={`opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all duration-200 p-1 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}
                            title="Delete chat"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Mobile Header with Hamburger */}
          <div className={`md:hidden flex items-center p-4 border-b transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700/50 bg-gray-800/80' : 'border-gray-200/50 bg-white/80'
          } backdrop-blur-sm relative z-20`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex-1 flex justify-center">
              <Image
                src={GFLogo}
                alt="Glass Factory Logo"
                width={125}
                height={32}
                className={`select-none transition-all duration-300 ${isDarkMode ? 'invert' : ''}`}
              />
            </div>

          </div>

          {/* Chat Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/2 to-transparent pointer-events-none"></div>
          

          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            onScroll={checkIfUserScrolledUp}
            className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10"
            style={{
              // Improve mobile scrolling performance
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            <div className="min-h-full flex flex-col justify-end space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Profile Icon for Bot (left side) */}
                {!message.isUser && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
                    <Image
                      src="/images/icons/account-avatar.png"
                      alt="Glass Factory Assistant"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div
                  className={`min-w-[80px] max-w-xs md:max-w-lg rounded-lg font-inter-tight shadow-sm break-words overflow-hidden ${
                    message.isUser
                      ? isDarkMode
                        ? 'glass-bubble-dark text-gray-100'
                        : 'glass-bubble text-neutral-900'
                      : isDarkMode
                        ? 'glass-bubble-dark text-gray-100'
                        : 'glass-bubble text-neutral-900'
                  }`}
                  style={{
                    ...(message.isUser ? {
                      background: isDarkMode 
                        ? 'linear-gradient(to right, rgb(75, 85, 99), rgb(31, 41, 55))' 
                        : 'linear-gradient(to right, rgb(243, 244, 246), rgb(209, 213, 219))',
                      backdropFilter: 'blur(6px) saturate(110%)',
                      WebkitBackdropFilter: 'blur(6px) saturate(110%)',
                      boxShadow: isDarkMode 
                        ? '4px 4px 12px rgba(0, 0, 0, 0.3), -2px -2px 6px rgba(75, 85, 99, 0.1)' 
                        : '4px 4px 12px rgba(0, 0, 0, 0.1), -2px -2px 6px rgba(255, 255, 255, 0.8)'
                    } : {
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.4), rgba(75, 85, 99, 0.2))'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(249, 250, 251, 0.6))',
                      backdropFilter: 'blur(8px) saturate(120%)',
                      WebkitBackdropFilter: 'blur(8px) saturate(120%)',
                      boxShadow: isDarkMode
                        ? '-4px 4px 12px rgba(0, 0, 0, 0.3), 2px -2px 6px rgba(55, 65, 81, 0.1)'
                        : '-4px 4px 12px rgba(0, 0, 0, 0.1), 2px -2px 6px rgba(255, 255, 255, 0.8)'
                    })
                  }}
                >
                  {/* Image display */}
                  {message.image && (
                    <div className="mb-3">
                      <img
                        src={message.image}
                        alt="Uploaded image"
                        className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                      />
                    </div>
                  )}
                  
                  {/* Text content */}
                  {message.text && (
                    <div className={`px-4 py-3 ${message.image ? 'pt-0' : ''}`}>
                      {message.isUser ? (
                        // User messages: timestamp at left corner, text right-aligned with space
                        <div className="flex justify-between items-end">
                          <span className={`text-body-xs flex-shrink-0 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <span className="text-body-regular leading-relaxed text-right ml-4 flex-1">{message.text}</span>
                        </div>
                      ) : (
                        // Bot messages: text at top, timestamp at bottom right
                        <div className="relative">
                          <div className="text-body-regular leading-relaxed whitespace-pre-wrap break-words">
                            {(typingMessageId === message.id ? displayedText : message.text)
                              .split(/(\d+\.\s)/)
                              .map((part, index) => {
                                // If part matches number pattern, make it a new line
                                if (/^\d+\.\s$/.test(part) && index > 0) {
                                  return <><br key={index} />{part}</>;
                                }
                                
                                // Check for URLs (including those in brackets) and make them clickable
                                const urlRegex = /\[?(https?:\/\/[^\s\]]+)\]?/g;
                                if (urlRegex.test(part)) {
                                  return part.split(urlRegex).map((chunk, chunkIndex) => {
                                    const urlMatch = chunk.match(/https?:\/\/[^\s\]]+/);
                                    if (urlMatch) {
                                      const cleanUrl = urlMatch[0];
                                      const displayUrl = cleanUrl.length > 50 ? cleanUrl.substring(0, 50) + '...' : cleanUrl;
                                      return (
                                        <a
                                          key={`${index}-${chunkIndex}`}
                                          href={cleanUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-1 underline transition-colors duration-200 break-all ${
                                            isDarkMode 
                                              ? 'text-blue-400 hover:text-blue-300' 
                                              : 'text-blue-600 hover:text-blue-800'
                                          }`}
                                          title={cleanUrl}
                                        >
                                          <span className="break-all">{displayUrl}</span>
                                          <svg 
                                            className="w-3 h-3 flex-shrink-0" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                          >
                                            <path 
                                              strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth={2} 
                                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                                            />
                                          </svg>
                                        </a>
                                      );
                                    }
                                    
                                    // Remove brackets around factory names in profile links
                                    if (chunk.includes('[') && chunk.includes(']') && !chunk.includes('http')) {
                                      return chunk.replace(/\[([^\]]+)\]/g, '$1');
                                    }
                                    
                                    return chunk;
                                  });
                                }
                                
                                return part;
                              })}
                            {typingMessageId === message.id && (
                              <span className="animate-pulse">|</span>
                            )}
                          </div>
                          <div className="flex justify-end mt-2">
                            <span className={`text-body-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-neutral-500'
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* If only image, show timestamp */}
                  {message.image && !message.text && (
                    <div className={`px-4 py-2 ${message.isUser ? 'text-right' : 'text-left'}`}>
                      <span className={`text-body-xs ${
                        message.isUser ? (isDarkMode ? 'text-gray-300' : 'text-gray-600') : 'text-neutral-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Icon for User (right side) */}
                {message.isUser && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
                    <Image
                      src={profilePicture || "/images/icons/account-avatar.png"}
                      alt="Your profile"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Sample Prompts - Desktop only */}
            {messages.length === 1 && (
              <div className="hidden md:flex flex-col items-center justify-center py-8 space-y-6">
                <div className="text-center mb-4">
                  <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Try asking something like:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
                  {randomPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={async () => {
                        setInputValue(prompt);
                        
                        // Directly send the message without waiting for input state
                        if (!isLoading && sessionId) {
                          const userMessage = {
                            id: Date.now().toString(),
                            text: prompt,
                            isUser: true,
                            timestamp: new Date()
                          };

                          setMessages(prev => [...prev, userMessage]);
                          setInputValue('');
                          setIsLoading(true);

                          // Scroll to show the user's message immediately after sending
                          setTimeout(() => {
                            if (messagesContainerRef.current) {
                              const isMobile = window.innerWidth < 768;
                              
                              if (isMobile) {
                                const container = messagesContainerRef.current;
                                container.scrollTop = container.scrollHeight;
                              } else {
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }
                          }, 50);

                          try {
                            const requestBody = {
                              message: prompt,
                              sessionId: sessionId,
                              isNewSession: isNewSession,
                              userProfile: {
                                isAuthenticated: isAuthenticated
                              }
                            };

                            if (isNewSession) {
                              setIsNewSession(false);
                            }

                            const response = await fetch('/api/chat', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(requestBody),
                            });

                            if (!response.ok) {
                              throw new Error('Failed to send message');
                            }

                            const data = await response.json();
                            
                            const botMessage = {
                              id: (Date.now() + 1).toString(),
                              text: data.response || "Sorry, I couldn't process that request.",
                              isUser: false,
                              timestamp: new Date()
                            };

                            setMessages(prev => [...prev, botMessage]);
                            startTypingEffect(botMessage.id, botMessage.text);
                          } catch (error) {
                            console.error('Error sending message:', error);
                            const errorMessage = {
                              id: (Date.now() + 1).toString(),
                              text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                              isUser: false,
                              timestamp: new Date()
                            };
                            setMessages(prev => [...prev, errorMessage]);
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg text-center ${
                        isDarkMode
                          ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 text-gray-200 hover:border-gray-600'
                          : 'bg-white/80 border-gray-200 hover:bg-gray-50 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium leading-relaxed">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="flex items-end gap-3 justify-start">
                {/* Bot Profile Icon for Loading */}
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
                  <Image
                    src="/images/icons/account-avatar.png"
                    alt="Glass Factory Assistant"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className={`min-w-[80px] max-w-xs md:max-w-lg px-4 py-3 rounded-lg font-inter-tight shadow-sm ${
                  isDarkMode ? 'glass-bubble-dark text-gray-100' : 'glass-bubble text-neutral-900'
                }`}>
                  <div className="flex space-x-1">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? 'bg-gray-400' : 'bg-neutral-400'
                    }`}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? 'bg-gray-400' : 'bg-neutral-400'
                    }`} style={{ animationDelay: '0.1s' }}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? 'bg-gray-400' : 'bg-neutral-400'
                    }`} style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 flex-shrink-0 relative z-10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="ml-0 mr-0 md:ml-8 md:mr-12">
              {/* Quick Search - Mobile only, horizontal scroll */}
              {messages.length === 1 && (
                <div className="md:hidden mb-4">
                  <div className="overflow-x-auto scrollbar-hide -mx-4">
                    <div className="flex space-x-3 pb-2 pl-4 pr-4">
                      {randomPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={async () => {
                            setInputValue(prompt);
                            
                            // Directly send the message without waiting for input state
                            if (!isLoading && sessionId) {
                              const userMessage = {
                                id: Date.now().toString(),
                                text: prompt,
                                isUser: true,
                                timestamp: new Date()
                              };

                              setMessages(prev => [...prev, userMessage]);
                              setInputValue('');
                              setIsLoading(true);

                              // Scroll to show the user's message immediately after sending
                              setTimeout(() => {
                                if (messagesContainerRef.current) {
                                  const container = messagesContainerRef.current;
                                  container.scrollTop = container.scrollHeight;
                                }
                              }, 50);

                              try {
                                const requestBody = {
                                  message: prompt,
                                  sessionId: sessionId,
                                  isNewSession: isNewSession,
                                  userProfile: {
                                    isAuthenticated: isAuthenticated
                                  }
                                };

                                if (isNewSession) {
                                  setIsNewSession(false);
                                }

                                const response = await fetch('/api/chat', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(requestBody),
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to send message');
                                }

                                const data = await response.json();
                                
                                const botMessage = {
                                  id: (Date.now() + 1).toString(),
                                  text: data.response || "Sorry, I couldn't process that request.",
                                  isUser: false,
                                  timestamp: new Date()
                                };

                                setMessages(prev => [...prev, botMessage]);
                                startTypingEffect(botMessage.id, botMessage.text);
                              } catch (error) {
                                console.error('Error sending message:', error);
                                const errorMessage = {
                                  id: (Date.now() + 1).toString(),
                                  text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                                  isUser: false,
                                  timestamp: new Date()
                                };
                                setMessages(prev => [...prev, errorMessage]);
                              } finally {
                                setIsLoading(false);
                              }
                            }
                          }}
                          className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition-all duration-200 w-48 ${
                            isDarkMode
                              ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 text-gray-200 hover:border-gray-600'
                              : 'bg-white/80 border-gray-200 hover:bg-gray-50 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-sm font-medium leading-relaxed">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className={`mb-4 p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700' 
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        {selectedImage?.name}
                      </p>
                      <p className={`text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={removeImage}
                      className={`hover:text-gray-600 transition-colors ${
                        isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Input Row */}
              <div className="flex space-x-2 md:space-x-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {/* Input field with integrated upload icon */}
                <div className="flex-1 relative">
                  <div className="relative flex items-center">
                    {/* Upload icon inside input - only on mobile */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className={`absolute left-3 z-10 p-1 md:hidden transition-colors duration-200 ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-gray-200' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="Attach image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Glass AI"
                      className={`w-full border rounded-lg focus:outline-none font-inter-tight text-body-regular transition-all duration-200 ${
                        isDarkMode 
                          ? 'border-gray-600 focus:border-gray-500 focus:ring-2 focus:ring-gray-700 bg-gray-700 text-gray-100 placeholder-gray-400'
                          : 'border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 bg-white text-gray-900 placeholder-gray-500'
                      } ${
                        // Adjust padding and height based on screen size - more left padding on mobile for icon, taller on mobile
                        'py-4 pl-12 pr-4 md:py-3 md:pl-4 md:pr-4'
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                {/* Attachment button - desktop only */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className={`hidden md:flex items-center justify-center hover:shadow-lg disabled:opacity-50 px-4 md:px-6 py-3 rounded-lg transition-all duration-button shadow-sm ${
                    isDarkMode 
                      ? 'glass-bubble-dark text-gray-100' 
                      : 'glass-bubble text-neutral-900'
                  }`}
                  title="Attach image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                <button
                  onClick={sendMessage}
                  disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                  onMouseMove={(e) => {
                    if (!e.currentTarget.disabled) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      e.currentTarget.style.background = `radial-gradient(circle at ${x}px ${y}px, #0015ff 0%, #000d99 100%)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #0015ff 0%, #000d99 81.25%)';
                    }
                  }}
                  className="hover:shadow-lg disabled:opacity-50 px-4 md:px-6 py-3 rounded-lg transition-all duration-200 font-inter-tight font-medium text-white"
                  style={{ 
                    background: (!inputValue.trim() && !selectedImage) || isLoading 
                      ? '#6b7280' 
                      : 'linear-gradient(90deg, #0015ff 0%, #000d99 81.25%)' 
                  }}
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}