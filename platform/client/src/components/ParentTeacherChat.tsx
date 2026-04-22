import { useState, useEffect, useRef, useCallback } from 'react';
import { messagingApi, Conversation, Message } from '../services/messagingApi';
import { useAuth } from '../context/AuthContext';
import './ParentTeacherChat.css';

interface ParentTeacherChatProps {
  initialConversationId?: string;
  teacherId?: string;
  studentId?: string;
  compact?: boolean;
  onClose?: () => void;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}

function getMessageTypeIcon(type: Message['message_type']): string {
  switch (type) {
    case 'progress_update': return '📊';
    case 'behavior_alert': return '⚠️';
    case 'appointment_request': return '📅';
    case 'appointment_confirmed': return '✅';
    case 'appointment_cancelled': return '❌';
    default: return '💬';
  }
}

function TypingIndicator() {
  return (
    <div className="ptc-typing-indicator">
      <span className="ptc-typing-dot"></span>
      <span className="ptc-typing-dot"></span>
      <span className="ptc-typing-dot"></span>
    </div>
  );
}

export default function ParentTeacherChat({ initialConversationId, teacherId, studentId, compact = false, onClose }: ParentTeacherChatProps) {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConversationsList, setShowConversationsList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  useEffect(() => {
    if (!token) return;
    loadConversations();
  }, [token]);

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) selectConversation(conv);
    }
  }, [initialConversationId, conversations]);

  // Auto-select teacher if provided
  useEffect(() => {
    if (teacherId && conversations.length > 0) {
      const conv = conversations.find(c => c.participant_teacher_id === teacherId);
      if (conv) selectConversation(conv);
    }
  }, [teacherId, conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { conversations: convs } = await messagingApi.getConversations(token!);
      setConversations(convs);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      // Use mock data for demo
      setConversations([
        {
          id: 'demo-conv-1',
          participant_parent_id: 'demo-parent',
          participant_teacher_id: 'demo-teacher',
          student_id: 'demo-student',
          last_message_at: new Date().toISOString(),
          last_message_preview: 'Chào mừng đến với RoboKids!',
          unread_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          teacher: { id: 'demo-teacher', full_name: 'Cô Minh', avatar_url: undefined },
          student: { id: 'demo-student', full_name: 'Nguyễn Văn A' },
        },
      ]);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowConversationsList(false);
    setLoadingMessages(true);
    try {
      const { messages: msgs } = await messagingApi.getMessages(token!, conversation.id);
      setMessages(msgs);
      // Mark as read
      messagingApi.markAsRead(token!, conversation.id).catch(() => {});
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      // Demo messages
      setMessages([
        {
          id: 'msg-1',
          sender_id: 'demo-teacher',
          sender_type: 'teacher',
          receiver_id: 'demo-parent',
          receiver_type: 'parent',
          content: 'Chào mừng phụ huynh đến với RoboKids! Tôi là giáo viên của con bạn.',
          message_type: 'text',
          is_read: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConversation || !token) return;

    const receiverType = user?.role === 'teacher' ? 'parent' : 'teacher';
    const receiverId = selectedConversation.participant_teacher_id || selectedConversation.participant_parent_id;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user?.id || 'demo-user',
      sender_type: user?.role === 'teacher' ? 'teacher' : 'parent',
      receiver_id: receiverId,
      receiver_type: receiverType,
      student_id: selectedConversation.student_id,
      content: input.trim(),
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    scrollToBottom();

    try {
      const { message: sentMsg } = await messagingApi.sendMessage(token, {
        receiver_id: receiverId,
        receiver_type: receiverType,
        student_id: selectedConversation.student_id,
        content: input.trim(),
      });
      // Update with server message
      setMessages(prev => prev.map(m => m.id === userMsg.id ? sentMsg : m));
    } catch (err) {
      console.error('Failed to send message:', err);
      // Keep local message anyway for demo
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Compact mode - single conversation view
  if (compact) {
    return (
      <div className="ptc-container ptc-compact">
        <div className="ptc-header">
          <button className="ptc-back-btn" onClick={() => setShowConversationsList(true)}>←</button>
          <div className="ptc-avatar">{selectedConversation?.teacher?.full_name?.[0] || 'T'}</div>
          <div className="ptc-header-info">
            <span className="ptc-header-name">{selectedConversation?.teacher?.full_name || 'Giáo viên'}</span>
            <span className="ptc-header-sub">{selectedConversation?.student?.full_name || ''}</span>
          </div>
          {onClose && <button className="ptc-close-btn" onClick={onClose}>×</button>}
        </div>

        <div className="ptc-messages">
          {loadingMessages ? (
            <div className="ptc-loading">Đang tải tin nhắn...</div>
          ) : messages.length === 0 ? (
            <div className="ptc-empty">Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id || msg.sender_type !== (user?.role === 'teacher' ? 'teacher' : 'parent');
              return (
                <div key={msg.id} className={`ptc-message ${isMe ? 'ptc-message-me' : 'ptc-message-other'}`}>
                  {msg.message_type !== 'text' && (
                    <span className="ptc-message-type-icon">{getMessageTypeIcon(msg.message_type)}</span>
                  )}
                  <div className={`ptc-bubble ${msg.message_type !== 'text' ? 'ptc-bubble-special' : ''}`}>
                    {msg.content}
                  </div>
                  <span className="ptc-timestamp">{formatMessageTime(msg.created_at)}</span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ptc-input-area">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn tin..."
            className="ptc-input"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ptc-send-btn"
          >
            ✈️
          </button>
        </div>
      </div>
    );
  }

  // Full mode - conversations list
  return (
    <div className="ptc-container ptc-full">
      {showConversationsList || !selectedConversation ? (
        <div className="ptc-conversations-list">
          <div className="ptc-header">
            <h2 className="ptc-title">💬 Tin nhắn</h2>
            <span className="ptc-badge">{conversations.filter(c => c.unread_count > 0).length}</span>
          </div>

          {loading ? (
            <div className="ptc-loading">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="ptc-empty">
              <div className="ptc-empty-icon">💬</div>
              <p>Chưa có cuộc trò chuyện nào</p>
              <p className="ptc-empty-sub">Liên hệ giáo viên để bắt đầu</p>
            </div>
          ) : (
            <div className="ptc-conversations">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`ptc-conversation-item ${conv.unread_count > 0 ? 'ptc-unread' : ''}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className="ptc-avatar ptc-avatar-lg">
                    {conv.teacher?.full_name?.[0] || conv.parent?.full_name?.[0] || '?'}
                  </div>
                  <div className="ptc-conversation-info">
                    <div className="ptc-conversation-top">
                      <span className="ptc-conversation-name">
                        {conv.teacher?.full_name || 'Giáo viên'}
                      </span>
                      <span className="ptc-conversation-time">
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    </div>
                    {conv.student && (
                      <span className="ptc-conversation-student">👤 {conv.student.full_name}</span>
                    )}
                    <p className="ptc-conversation-preview">
                      {conv.last_message_preview || 'Chưa có tin nhắn'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="ptc-unread-badge">{conv.unread_count}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="ptc-chat-view">
          <div className="ptc-header">
            <button className="ptc-back-btn" onClick={() => {
              setSelectedConversation(null);
              setShowConversationsList(true);
            }}>←</button>
            <div className="ptc-avatar">
              {selectedConversation.teacher?.full_name?.[0] || 'T'}
            </div>
            <div className="ptc-header-info">
              <span className="ptc-header-name">
                {selectedConversation.teacher?.full_name || 'Giáo viên'}
              </span>
              <span className="ptc-header-sub">
                {selectedConversation.student?.full_name || ''}
              </span>
            </div>
          </div>

          <div className="ptc-messages">
            {loadingMessages ? (
              <div className="ptc-loading">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="ptc-empty">
                <div className="ptc-empty-icon">👋</div>
                <p>Bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`ptc-message ${isMe ? 'ptc-message-me' : 'ptc-message-other'}`}>
                    {msg.message_type !== 'text' && (
                      <span className="ptc-message-type-icon">{getMessageTypeIcon(msg.message_type)}</span>
                    )}
                    <div className={`ptc-bubble ${msg.message_type !== 'text' ? 'ptc-bubble-special' : ''}`}>
                      {msg.content}
                    </div>
                    <span className="ptc-timestamp">{formatMessageTime(msg.created_at)}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ptc-input-area">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin cho giáo viên..."
              className="ptc-input"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="ptc-send-btn"
            >
              ✈️ Gửi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
