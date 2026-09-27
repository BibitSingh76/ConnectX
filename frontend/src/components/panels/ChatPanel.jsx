import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Inbox } from 'lucide-react';
import { Button } from '../Button';
import socketService from '../../services/socketService';

export const ChatPanel = ({ isOpen, onClose, roomId, currentUserName, onNewMessageRead }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const handleChatMessage = (messagePayload) => {
      setMessages((prev) => [...prev, messagePayload]);
      if (!isOpen && onNewMessageRead) {
        onNewMessageRead();
      }
    };

    socketService.on('chat_message', handleChatMessage);

    return () => {
      socketService.off('chat_message', handleChatMessage);
    };
  }, [roomId, isOpen, onNewMessageRead]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socketService.sendChatMessage(roomId, inputText.trim(), currentUserName || 'You');
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="w-full md:w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-30 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm">In-Meeting Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          aria-label="Close Chat Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-300">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Send a message to start the room conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === socketService.socketId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    isSelf
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold opacity-90">{isSelf ? 'You' : msg.senderName}</span>
                    <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                  </div>
                  <p className="break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message & press Enter..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button type="submit" variant="primary" className="!p-2.5 !rounded-xl" aria-label="Send Message">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
