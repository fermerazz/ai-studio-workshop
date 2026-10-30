import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PieceColor } from '../types/chess';
import { Send, MessageSquare } from 'lucide-react';

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  yourColor: PieceColor | null;
  yourName: string;
}

const QUICK_PHRASES = [
  'Good luck! ♟️',
  'Nice move! 👏',
  'Well played!',
  'Oops! 😅',
  'Thanks for the game!',
  'Rematch?',
];

export const GameChat: React.FC<GameChatProps> = ({
  messages,
  onSendMessage,
  yourColor,
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText('');
  };

  const handleQuickPhrase = (phrase: string) => {
    onSendMessage(phrase);
  };

  return (
    <div className="flex flex-col h-full bg-[#181b20] border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-[#14161a]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Game Chat
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {messages.length} msgs
        </span>
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 text-xs"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center font-sans">
            Say hi or wish your friend good luck!
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="py-1 px-2.5 rounded bg-slate-800/40 border border-slate-800/60 text-slate-400 text-[11px] text-center italic"
                >
                  {msg.text}
                </div>
              );
            }

            const isWhite = msg.color === 'w';
            const isBlack = msg.color === 'b';

            return (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {isWhite && (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300 inline-block shrink-0" />
                  )}
                  {isBlack && (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600 inline-block shrink-0" />
                  )}
                  <span
                    className={`font-semibold ${
                      isWhite
                        ? 'text-amber-200'
                        : isBlack
                        ? 'text-slate-300'
                        : 'text-sky-400'
                    }`}
                  >
                    {msg.sender}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-slate-200 bg-slate-800/60 px-2.5 py-1.5 rounded-lg rounded-tl-none border border-slate-700/40 break-words max-w-[95%]">
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick reaction buttons */}
      <div className="px-2 py-1.5 bg-[#14161a] border-t border-slate-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => handleQuickPhrase(phrase)}
            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors shrink-0"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="p-2 bg-[#181b20] border-t border-slate-800 flex gap-1.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
