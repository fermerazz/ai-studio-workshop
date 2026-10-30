import React, { useState } from 'react';
import { Copy, Check, Share2, Users, Loader2 } from 'lucide-react';

interface ShareGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const ShareGameModal: React.FC<ShareGameModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${roomCode}`
    : `https://.../?room=${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#181b20] border border-amber-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-slate-100">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
            <Share2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-sans text-slate-100">
            Invite Your Friend
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Send this room code or direct link to your opponent to start playing right away.
          </p>
        </div>

        {/* Room Code Display */}
        <div className="mb-5 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Room Code
          </span>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black font-mono tracking-widest text-amber-300">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Shareable Link */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Direct Match Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Waiting Status */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-amber-300/90 mb-5">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Waiting for your friend to enter the match...</span>
        </div>

        {/* Dismiss / Close button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close & Go to Board
          </button>
        </div>
      </div>
    </div>
  );
};
