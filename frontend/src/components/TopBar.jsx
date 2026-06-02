import React from 'react';
import { Copy, Share2, Settings, LogOut } from 'lucide-react';

const TopBar = ({ meetingTitle, roomId, copied, onCopyRoom }) => {
  return (
    <div className="sticky top-0 z-30 bg-[#09090B] border-b border-white/8">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* LEFT: Logo + Meeting Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#A3E635] text-[#09090B] font-bold">
            IM
          </div>
          <div>
            <h1 className="text-lg font-bold">{meetingTitle || "Meeting"}</h1>
            <p className="text-xs text-white/40">{roomId}</p>
          </div>
        </div>

        {/* CENTER: Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
            <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse"></span>
            <span className="text-sm font-medium">Live</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
            <span className="text-sm font-medium">Transcript Active</span>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyRoom}
            className="p-2.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 transition"
            title="Copy room code"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            className="p-2.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 transition"
            title="Share link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            className="p-2.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
