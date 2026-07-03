import React, { useState, useEffect, useRef } from 'react';

// ─── Lightweight Markdown Renderer ─────────────────────────────────────────────
// Supports: **bold**, `code`, # headers, bullet lists (- / *), numbered lists
const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];
  let listType = null; // 'ul' | 'ol'

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(
      <Tag key={`list-${key}`} style={{ paddingLeft: '20px', margin: '6px 0' }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ marginBottom: '4px', lineHeight: 1.5 }}>
            {renderInline(item)}
          </li>
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    // Headings
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    // Bullet list
    const ul = line.match(/^[-*]\s+(.+)/);
    // Numbered list
    const ol = line.match(/^\d+\.\s+(.+)/);
    // Horizontal rule
    const hr = line.match(/^---+$/);

    if (h3) {
      flushList(i);
      elements.push(<h3 key={i} style={{ fontSize: '13px', fontWeight: 700, margin: '10px 0 4px', color: 'var(--text-primary)' }}>{renderInline(h3[1])}</h3>);
    } else if (h2) {
      flushList(i);
      elements.push(<h2 key={i} style={{ fontSize: '14px', fontWeight: 700, margin: '12px 0 4px', color: 'var(--text-primary)' }}>{renderInline(h2[1])}</h2>);
    } else if (h1) {
      flushList(i);
      elements.push(<h1 key={i} style={{ fontSize: '15px', fontWeight: 700, margin: '12px 0 6px', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>{renderInline(h1[1])}</h1>);
    } else if (ul) {
      if (listType === 'ol') flushList(i);
      listType = 'ul';
      listBuffer.push(ul[1]);
    } else if (ol) {
      if (listType === 'ul') flushList(i);
      listType = 'ol';
      listBuffer.push(ol[1]);
    } else if (hr) {
      flushList(i);
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />);
    } else if (line.trim() === '') {
      flushList(i);
      elements.push(<div key={i} style={{ height: '6px' }} />);
    } else {
      flushList(i);
      elements.push(<p key={i} style={{ margin: '3px 0', lineHeight: 1.55 }}>{renderInline(line)}</p>);
    }
  });

  flushList('end');
  return elements;
};

// Inline: **bold**, `code`, *italic*
const renderInline = (text) => {
  const parts = [];
  // Pattern: **bold**, `code`, *italic*
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={match.index} style={{
          background: 'rgba(214,167,122,0.12)',
          color: 'var(--primary-hover)',
          padding: '1px 5px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
        }}>{match[3]}</code>
      );
    } else if (match[4]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    }
    last = regex.lastIndex;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
};

// ─── ChatBox Component ──────────────────────────────────────────────────────────
const ChatBox = () => {
  const [isOpen, setIsOpen]       = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];

    // Add user message only — NO empty assistant placeholder.
    // The typing indicator (controlled by `loading`) shows until first token.
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      // If the server returned a real HTTP error (e.g. 429, 500)
      // parse the JSON body for a meaningful message.
      if (!response.ok) {
        let errMsg = 'Something went wrong. Please try again.';
        try {
          const errData = await response.json();
          if (errData?.error) errMsg = errData.error;
        } catch { /* ignore */ }
        setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
        return;
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw   = decoder.decode(value, { stream: true });
        const lines = raw.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice('data: '.length).trim();

          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);

            // Handle mid-stream error event from the server
            if (parsed.error) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                // If an assistant bubble already exists, update it
                if (last?.role === 'assistant') {
                  const next = [...prev];
                  next[next.length - 1] = { ...last, content: last.content + ' [Stream interrupted]' };
                  return next;
                }
                return [...prev, { role: 'assistant', content: 'Stream interrupted. Please try again.' }];
              });
              break;
            }

            const { text } = parsed;
            if (text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  // Append to the existing in-progress assistant bubble
                  const next = [...prev];
                  next[next.length - 1] = { ...last, content: last.content + text };
                  return next;
                }
                // First token — create the assistant bubble now
                return [...prev, { role: 'assistant', content: text }];
              });
            }
          } catch { /* ignore malformed JSON */ }
        }
      }
    } catch (error) {
      console.error('Chat stream error:', error);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          const next = [...prev];
          next[next.length - 1] = { ...last, content: 'Something went wrong. Please try again.' };
          return next;
        }
        return [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── FAB button ── */
        .chatbot-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          border: none;
          box-shadow: 0 8px 24px rgba(214, 167, 122, 0.45);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          transition: background 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease;
          animation: chatFabFloat 3.5s ease-in-out infinite;
        }
        .chatbot-fab:hover {
          background: var(--primary-hover);
          box-shadow: 0 12px 32px rgba(214, 167, 122, 0.55);
        }
        .chatbot-fab:active { transform: scale(0.93); }
        .chatbot-fab.is-open { animation: none; background: var(--primary-hover); }
        @keyframes chatFabFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        /* ── Backdrop for expanded mode ── */
        .chat-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(30, 20, 10, 0.35);
          backdrop-filter: blur(4px);
          z-index: 1049;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .chat-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
        }

        /* ── Main chat window ── */
        .chat-window {
          position: fixed;
          z-index: 1050;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* default compact position */
          bottom: 100px;
          right: 28px;
          width: 380px;
          height: 520px;
          max-height: calc(100vh - 140px);
          /* animation */
          opacity: 0;
          transform: translateY(18px) scale(0.96);
          pointer-events: none;
          transition:
            opacity  0.3s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            width    0.35s cubic-bezier(0.16, 1, 0.3, 1),
            height   0.35s cubic-bezier(0.16, 1, 0.3, 1),
            bottom   0.35s cubic-bezier(0.16, 1, 0.3, 1),
            right    0.35s cubic-bezier(0.16, 1, 0.3, 1),
            border-radius 0.35s ease;
        }
        .chat-window.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        /* expanded state */
        .chat-window.expanded {
          bottom: 50%;
          right: 50%;
          transform: translate(50%, 50%);
          width: min(820px, 92vw);
          height: min(640px, 90vh);
          border-radius: var(--radius-lg);
        }
        .chat-window.expanded.open {
          transform: translate(50%, 50%);
        }

        /* ── Header ── */
        .chat-header {
          padding: 14px 18px;
          background: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          user-select: none;
        }
        .chat-header-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--primary-glow);
          border: 1.5px solid var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }
        .chat-header-info { flex: 1; min-width: 0; }
        .chat-header-info h4 {
          margin: 0;
          font-size: 14px;
          font-family: var(--font-serif);
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-header-info p {
          margin: 0;
          font-size: 11px;
          color: var(--text-muted);
        }
        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .chat-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.18s ease, color 0.18s ease;
        }
        .chat-icon-btn:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }
        .chat-icon-btn.close-btn:hover {
          background: var(--error-bg);
          color: var(--error);
        }

        /* ── Messages area ── */
        .chat-messages {
          flex: 1;
          padding: 18px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #FCFAF6;
          scroll-behavior: smooth;
        }
        .chat-msg-row {
          display: flex;
          flex-direction: column;
          animation: msgIn 0.28s ease forwards;
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-msg-row.user  { align-items: flex-end; }
        .chat-msg-row.assistant { align-items: flex-start; }

        .chat-msg-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 4px;
          color: var(--text-muted);
        }

        .chat-bubble {
          max-width: 82%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 13.5px;
          line-height: 1.5;
          word-break: break-word;
        }
        .chat-bubble.user {
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 14px rgba(214, 167, 122, 0.25);
        }
        .chat-bubble.assistant {
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-bottom-left-radius: 4px;
          box-shadow: var(--shadow-sm);
        }
        .chat-bubble.error {
          background: var(--error-bg);
          color: var(--error);
          border: 1px solid var(--error-border);
          border-bottom-left-radius: 4px;
        }

        /* formatted content inside assistant bubble */
        .chat-bubble.assistant ul,
        .chat-bubble.assistant ol {
          padding-left: 20px;
          margin: 6px 0;
        }
        .chat-bubble.assistant li { margin-bottom: 3px; }
        .chat-bubble.assistant p  { margin: 3px 0; }
        .chat-bubble.assistant h1,
        .chat-bubble.assistant h2,
        .chat-bubble.assistant h3 { color: var(--text-primary); }

        /* ── Empty state ── */
        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 24px;
          gap: 10px;
          color: var(--text-muted);
        }
        .chat-empty-icon {
          font-size: 36px;
          animation: pulseIcon 2.4s ease-in-out infinite;
        }
        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.12); }
        }
        .chat-empty h5 {
          font-family: var(--font-serif);
          font-size: 16px;
          color: var(--text-primary);
          margin: 0;
        }
        .chat-empty p { font-size: 13px; max-width: 230px; margin: 0; }

        /* ── Typing indicator ── */
        .chat-typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 10px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          box-shadow: var(--shadow-sm);
        }
        .chat-dot {
          width: 6px;
          height: 6px;
          background: var(--primary);
          border-radius: 50%;
          animation: dotBounce 1.3s ease-in-out infinite;
        }
        .chat-dot:nth-child(2) { animation-delay: 0.18s; }
        .chat-dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1.2); opacity: 1; }
        }

        /* ── Input form ── */
        .chat-input-form {
          padding: 14px 18px;
          background: var(--bg-card);
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .chat-input-field {
          flex: 1;
          padding: 11px 15px;
          border: 1.5px solid var(--border-color);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: 13.5px;
          color: var(--text-primary);
          outline: none;
          background: var(--bg-app);
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          resize: none;
          line-height: 1.4;
          max-height: 120px;
          overflow-y: auto;
        }
        .chat-input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
          background: var(--bg-card);
        }
        .chat-input-field:disabled { opacity: 0.6; cursor: not-allowed; }

        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: var(--primary);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.12s;
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) { background: var(--primary-hover); }
        .chat-send-btn:active:not(:disabled) { transform: scale(0.93); }
        .chat-send-btn:disabled {
          background: var(--border-color);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* ── Clear history chip ── */
        .chat-clear-btn {
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 11px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: color 0.18s, background 0.18s;
          align-self: center;
        }
        .chat-clear-btn:hover { color: var(--error); background: var(--error-bg); }
      `}</style>

      {/* ── Backdrop (expanded only) ── */}
      <div
        className={`chat-backdrop ${isExpanded && isOpen ? 'visible' : ''}`}
        onClick={() => setIsExpanded(false)}
      />

      {/* ── FAB toggle button ── */}
      <button
        className={`chatbot-fab ${isOpen ? 'is-open' : ''}`}
        onClick={() => { isOpen ? handleClose() : setIsOpen(true); }}
        aria-label="Toggle AI chat assistant"
        title="AI Task Assistant"
      >
        {isOpen ? (
          /* X icon when open */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          /* Chat bubble icon when closed */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* ── Chat window ── */}
      <div className={`chat-window ${isOpen ? 'open' : ''} ${isExpanded ? 'expanded' : ''}`}>

        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar">🤖</div>
          <div className="chat-header-info">
            <h4>Task Assistant</h4>
            <p>Powered by Gemini 2.5 Flash</p>
          </div>
          <div className="chat-header-actions">
            {/* Expand / Collapse button */}
            <button
              className="chat-icon-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
              aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
            >
              {isExpanded ? (
                /* Collapse icon */
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="10" y1="14" x2="3" y2="21" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                </svg>
              ) : (
                /* Expand icon */
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>

            {/* Close button */}
            <button
              className="chat-icon-btn close-btn"
              onClick={handleClose}
              title="Close chat"
              aria-label="Close chat"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">✨</div>
              <h5>How can I help you?</h5>
              <p>Ask me to prioritize, plan, or give advice on managing your tasks.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isError = msg.content === 'Something went wrong. Please try again.';
              return (
                <div key={index} className={`chat-msg-row ${isUser ? 'user' : 'assistant'}`}>
                  <div className="chat-msg-label">{isUser ? 'You' : 'Assistant'}</div>
                  <div className={`chat-bubble ${isUser ? 'user' : isError ? 'error' : 'assistant'}`}>
                    {isUser
                      ? msg.content
                      : <div>{renderMarkdown(msg.content)}</div>
                    }
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="chat-msg-row assistant">
              <div className="chat-msg-label">Assistant</div>
              <div className="chat-typing">
                <div className="chat-dot" />
                <div className="chat-dot" />
                <div className="chat-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="chat-input-form">
          {messages.length > 0 && (
            <button
              type="button"
              className="chat-clear-btn"
              onClick={() => setMessages([])}
              title="Clear conversation"
            >
              Clear
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            className="chat-input-field"
            placeholder="Ask your assistant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={loading || !input.trim()}
            title="Send message"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatBox;
