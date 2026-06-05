import React from 'react';
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';

const ControlBar = ({
  isMuted,
  onToggleMic,
  onLeaveMeeting,
  onEndMeeting,
  isEndingMeeting,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#040506] via-[#040506]/95 to-transparent pt-4 pb-6">
      <div className="flex items-center justify-center gap-3 px-6">
        {/* GLASS PANEL */}
        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* MIC BUTTON */}
          <button
            onClick={onToggleMic}
            className={`p-3 rounded-full transition ${
              isMuted
                ? 'bg-[#ff6363]/20 border border-[#ff6363]/40 hover:bg-[#ff6363]/30'
                : 'bg-[#59d499]/20 border border-[#59d499]/40 hover:bg-[#59d499]/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 text-[#ff6363]" />
            ) : (
              <Mic className="w-5 h-5 text-[#59d499]" />
            )}
          </button>

          {/* DIVIDER */}
          <div className="w-px h-6 bg-white/10"></div>

          {/* LEAVE BUTTON */}
          <button
            onClick={onLeaveMeeting}
            className="p-3 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition"
            title="Leave meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>

          {/* DIVIDER */}
          <div className="w-px h-6 bg-white/10"></div>

          {/* END FOR ALL BUTTON */}
          <button
            onClick={onEndMeeting}
            disabled={isEndingMeeting}
            className="p-3 rounded-full bg-[#ff6363]/20 border border-[#ff6363]/40 hover:bg-[#ff6363]/30 transition disabled:opacity-50"
            title="End meeting for all"
          >
            {isEndingMeeting ? (
              <Loader2 className="w-5 h-5 text-[#ff6363] animate-spin" />
            ) : (
              <PhoneOff className="w-5 h-5 text-[#ff6363]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
