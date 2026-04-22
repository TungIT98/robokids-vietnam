import { useState, useRef, useEffect, useCallback } from 'react';
import { aiApi } from '../services/api';
import { ttsService } from '../services/tts';
import { useAIPrewarm } from '../hooks/useAIPrewarm';
import css from './ChatPanel.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  error?: boolean;
  isProactive?: boolean;
}

interface SelectedBlock {
  blockType: string;
  blockId: string;
  fields: Record<string, any>;
}

interface ChatPanelProps {
  onAnalyze?: (xml: string) => void;
  blocklyXml?: string;
  selectedBlock?: SelectedBlock | null;
  userAge?: number;
  studentId?: string;
  currentLesson?: number;
}

function TypingIndicator() {
  return (
    <div className={css.typingIndicator}>
      <span className={css.typingDot}>🤖</span>
      <div className={css.dots}>
        <span className={`${css.dot}`} style={{ animationDelay: '0ms' }}>●</span>
        <span className={`${css.dot}`} style={{ animationDelay: '150ms' }}>●</span>
        <span className={`${css.dot}`} style={{ animationDelay: '300ms' }}>●</span>
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={css.codeBlockWrapper}>
      <div className={css.codeBlockHeader}>
        <span className={css.codeBlockLabel}>Code</span>
        <button onClick={handleCopy} className={css.copyButton}>
          {copied ? '✓ Đã chép' : '📋 Chép'}
        </button>
      </div>
      <pre className={css.codeBlock}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function parseCodeBlocks(content: string): { text: string; code?: string }[] {
  const parts: { text: string; code?: string }[] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index) });
    }
    const code = match[0].replace(/```\w*\n?/, '').replace(/```$/, '');
    parts.push({ text: '', code });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text: content }];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export default function ChatPanel({ onAnalyze, blocklyXml, selectedBlock, userAge, studentId, currentLesson }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: 'assistant',
      content: '🌟 Chào mừng đến với HỌC VIỆN VŨ TRỤ ROBOKIDS! 🚀\n\nMình là RoboBuddy - phi hành gia AI của các bạn! ⭐\n\nSẵn sàng cùng bạn khám phá lập trình robot và chinh phục vũ trụ chưa nào? 🌌✨',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);
  const [showProactive, setShowProactive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const proactiveCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { prewarm, resetPrewarm } = useAIPrewarm();

  // Pre-warm AI when student hovers over the chat panel
  const handleMouseEnter = useCallback(() => {
    if (studentId) {
      prewarm({ age: userAge, currentLesson });
    }
  }, [studentId, userAge, currentLesson, prewarm]);

  // Reset prewarm when component unmounts or student leaves
  useEffect(() => {
    return () => {
      resetPrewarm();
    };
  }, [resetPrewarm]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Speak new assistant messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !isMuted) {
      // Clean markdown/formatting from text before speaking
      const cleanText = lastMsg.content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*_#`]/g, '')
        .trim();
      if (cleanText) {
        ttsService.speak(cleanText);
      }
    }
  }, [messages, isMuted]);

  // Stop TTS when component unmounts
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  // Record task start when blocklyXml changes (new task)
  useEffect(() => {
    if (studentId && blocklyXml) {
      aiApi.proactiveEvent(studentId, 'task_start', { blocklyXmlLength: blocklyXml.length }, userAge)
        .catch(() => {}); // Silent fail
    }
  }, [blocklyXml]);

  // Record input events for typing pattern analysis
  const recordInputEvent = useCallback(() => {
    if (studentId) {
      aiApi.proactiveEvent(studentId, 'input', {}, userAge)
        .catch(() => {}); // Silent fail
    }
  }, [studentId, userAge]);

  // Periodic proactive check (every 30 seconds if studentId exists)
  useEffect(() => {
    if (!studentId) return;

    // Initial task start
    aiApi.proactiveEvent(studentId, 'task_start', {}, userAge)
      .catch(() => {});

    proactiveCheckIntervalRef.current = setInterval(async () => {
      try {
        const result = await aiApi.proactiveCheck(studentId);
        if (result.shouldIntervene && result.message && !showProactive) {
          setProactiveMessage(result.message);
          setShowProactive(true);
        }
      } catch {
        // Silent fail
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (proactiveCheckIntervalRef.current) {
        clearInterval(proactiveCheckIntervalRef.current);
      }
      // Clear behavior session on unmount
      aiApi.proactiveClear(studentId).catch(() => {});
    };
  }, [studentId]);

  // Accept proactive suggestion
  const handleAcceptProactive = async () => {
    if (!proactiveMessage || !studentId) return;

    setShowProactive(false);
    const proactiveMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: proactiveMessage,
      timestamp: new Date(),
      isProactive: true
    };
    setMessages(prev => [...prev, proactiveMsg]);

    // Record intervention
    aiApi.proactiveIntervene(studentId, 'proactive', userAge).catch(() => {});
  };

  // Dismiss proactive suggestion
  const handleDismissProactive = () => {
    setShowProactive(false);
    if (studentId) {
      aiApi.proactiveEvent(studentId, 'input', { dismissed: true }, userAge)
        .catch(() => {});
    }
  };

  const handleAnalyze = async () => {
    if (!blocklyXml || isLoading) return;

    // Record AI request
    if (studentId) {
      aiApi.proactiveEvent(studentId, 'ai_request', { requestType: 'analyze' }, userAge).catch(() => {});
    }

    setIsLoading(true);
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: '🔍 Hãy phân tích code Blockly của mình!',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await aiApi.analyze(blocklyXml, undefined, userAge);
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: data.response, timestamp: new Date() }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: '😅 Ôi có lỗi rồi! Máy chủ đang bận. Thử lại sau nhé bạn!', timestamp: new Date(), error: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainBlock = async () => {
    if (!selectedBlock || isLoading) return;

    // Record AI request
    if (studentId) {
      aiApi.proactiveEvent(studentId, 'ai_request', { requestType: 'explain_block' }, userAge).catch(() => {});
    }

    setIsLoading(true);
    const blockTypeName = selectedBlock.blockType.replace(/_/g, ' ').toLowerCase();
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: `🤖 Hãy giải thích khối "${blockTypeName}" cho mình hiểu nhé!`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await aiApi.explainBlock(
        selectedBlock.blockType,
        selectedBlock.fields,
        selectedBlock.blockId,
        undefined,
        userAge
      );
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: data.response, timestamp: new Date() }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: '😅 Ôi có lỗi rồi! Máy chủ đang bận. Thử lại sau nhé bạn!', timestamp: new Date(), error: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (retryContent?: string) => {
    const contentToSend = retryContent || input.trim();
    if (!contentToSend || isLoading) return;

    // Record input event for typing pattern analysis
    recordInputEvent();

    const userMsg: Message = { id: generateId(), role: 'user', content: contentToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!retryContent) {
      setInput('');
    }
    setIsLoading(true);
    setLastUserMessage(contentToSend);

    try {
      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await aiApi.chat([...conversationHistory, { role: 'user', content: contentToSend }], undefined, userAge);
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: data.response, timestamp: new Date() }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: '😅 Ôi có lỗi rồi! Máy chủ đang bận. Thử lại sau nhé bạn!', timestamp: new Date(), error: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      // Remove last assistant message if it's an error
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.error) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      handleSend(lastUserMessage);
    }
  };

  const handleClearConversation = () => {
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: '🌟 Chào mừng đến với HỌC VIỆN VŨ TRỤ ROBOKIDS! 🚀\n\nMình là RoboBuddy - phi hành gia AI của các bạn! ⭐\n\nSẵn sàng cùng bạn khám phá lập trình robot và chinh phục vũ trụ chưa nào? 🌌✨',
      timestamp: new Date()
    }]);
    setLastUserMessage(null);
    setShowProactive(false);
    // Restart task tracking
    if (studentId) {
      aiApi.proactiveEvent(studentId, 'task_start', {}, userAge).catch(() => {});
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  return (
    <div className={css.container} onMouseEnter={handleMouseEnter}>
      <div className={css.header}>
        <span className={css.avatar}>🤖</span>
        <div className={css.headerText}>
          <span className={css.title}>RoboBuddy</span>
          <span className={css.subtitle}>AI Tutor</span>
        </div>
        <button
          onClick={handleClearConversation}
          className={css.clearButton}
          title="Xóa cuộc trò chuyện"
        >
          🗑️
        </button>
        <button
          onClick={() => setIsMuted(m => !m)}
          className={css.muteButton}
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <div ref={chatContainerRef} className={css.messages}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${css.messageRow} ${msg.role === 'user' ? css.userRow : css.assistantRow}`}
          >
            {msg.role === 'assistant' && (
              <div className={css.assistantAvatar}>🤖</div>
            )}
            <div
              className={`${css.bubble} ${msg.role === 'user' ? css.userBubble : css.assistantBubble}`}
            >
              {parseCodeBlocks(msg.content).map((part, pIdx) => (
                part.code ? (
                  <CodeBlock key={pIdx} code={part.code} />
                ) : (
                  <span key={pIdx} className={css.messageText}>{part.text}</span>
                )
              ))}
              {msg.timestamp && (
                <span className={css.timestamp}>
                  {formatTime(msg.timestamp)}
                </span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className={css.userAvatar}>🧒</div>
            )}
          </div>
        ))}
        {isLoading && <TypingIndicator />}
        {messages[messages.length - 1]?.error && !isLoading && (
          <div className={css.retryBar}>
            <button onClick={handleRetry} className={css.retryButton}>
              🔄 Thử lại
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Proactive Message Banner (RoboBuddy Space Academy) */}
      {showProactive && proactiveMessage && (
        <div className={css.proactiveBanner}>
          <div className={css.proactiveIcon}>🤖💫</div>
          <div className={css.proactiveContent}>
            <div className={css.proactiveText}>{proactiveMessage}</div>
            <div className={css.proactiveActions}>
              <button
                onClick={handleAcceptProactive}
                className={css.proactiveAccept}
              >
                ✨ Nhận hỗ trợ
              </button>
              <button
                onClick={handleDismissProactive}
                className={css.proactiveDismiss}
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      {(onAnalyze || selectedBlock) && (
        <div className={css.analyzeBar}>
          {selectedBlock && (
            <button
              onClick={handleExplainBlock}
              disabled={isLoading}
              className={css.explainButton}
              style={{ opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              💡 Giải thích khối "{selectedBlock.blockType.replace(/_/g, ' ')}"
            </button>
          )}
          {onAnalyze && (
            <button
              onClick={handleAnalyze}
              disabled={!blocklyXml || isLoading}
              className={css.analyzeButton}
              style={{ opacity: !blocklyXml || isLoading ? 0.5 : 1, cursor: !blocklyXml || isLoading ? 'not-allowed' : 'pointer' }}
            >
              🔬 Phân tích Code Blockly
            </button>
          )}
        </div>
      )}

      <div className={css.inputArea}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi RoboBuddy... (Enter gửi, Shift+Enter xuống dòng)"
          className={css.input}
          rows={2}
          disabled={isLoading}
        />
        <div className={css.inputFooter}>
          <span className={css.charCount}>{input.length}/500</span>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={css.sendButton}
            style={{ opacity: !input.trim() || isLoading ? 0.5 : 1, cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer' }}
          >
            ✈️ Gửi
          </button>
        </div>
      </div>
    </div>
  );
}