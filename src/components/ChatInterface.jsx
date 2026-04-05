import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function ChatInterface({ messages, onSend, isLoading, agentName, onComplete }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    onSend(text);
  };

  // Check if conversation is complete
  const isComplete = messages.some(m =>
    m.role === 'assistant' && (
      m.content.includes('[REASONING_COMPLETE]') ||
      m.content.includes('[CONCEPTUAL_COMPLETE]') ||
      m.content.includes('[METACOGNITIVE_COMPLETE]')
    )
  );

  const cleanContent = (content) => {
    return content
      .replace(/\[REASONING_COMPLETE\]/g, '')
      .replace(/\[CONCEPTUAL_COMPLETE\]/g, '')
      .replace(/\[METACOGNITIVE_COMPLETE\]/g, '')
      .trim();
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <Bot size={18} />
        <span>{agentName}</span>
        {isComplete && <span className="chat-complete-badge">Session complete</span>}
      </div>

      <div className="chat-messages">
        {messages.filter(m => m.role !== 'system').map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="bubble-icon">
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className="bubble-content">
              {cleanContent(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble assistant">
            <div className="bubble-icon"><Bot size={16} /></div>
            <div className="bubble-content loading">
              <Loader2 size={16} className="spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isComplete ? (
        <div className="chat-complete-bar">
          <p>This scaffolding session is complete. Revise your concept map based on what you've discussed.</p>
          <button onClick={onComplete} className="btn-primary">
            Revise My Map →
          </button>
        </div>
      ) : (
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your response..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            className="chat-input"
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="btn-send" aria-label="Send message">
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
