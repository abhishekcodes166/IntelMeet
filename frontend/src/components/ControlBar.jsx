import { useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  Captions,
  CaptionsOff,
  SmilePlus,
  MessageSquare,
} from "lucide-react";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🎉", "👏", "🔥", "💯"];

const ControlButton = ({ onClick, active, danger, disabled, title, children, label }) => (
  <div className="flex flex-col items-center gap-1">
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 ${
        danger
          ? "bg-[var(--danger)] text-white hover:opacity-90"
          : active
          ? "bg-white text-[var(--bg-base)] hover:opacity-90"
          : "bg-white/10 text-[var(--text-primary)] hover:bg-white/16"
      }`}
    >
      {children}
    </button>
    {label && (
      <span className="text-[10px] text-[var(--text-tertiary)] hidden sm:block">{label}</span>
    )}
  </div>
);

const ControlBar = ({
  isMuted,
  onToggleMic,
  micReady,
  transcriptionEnabled,
  onToggleTranscription,
  onSendReaction,
  onLeaveMeeting,
  onEndMeeting,
  isEndingMeeting,
  isHost,
  onToggleSidebar,
}) => {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-base)] relative">
      {/* REACTIONS POPOVER */}
      {showReactions && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass rounded-2xl px-3 py-2 flex gap-1 shadow-lg animate-fade-in-up z-20">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendReaction(emoji);
                setShowReactions(false);
              }}
              className="h-9 w-9 rounded-xl hover:bg-white/10 text-xl flex items-center justify-center transition hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="h-20 px-4 flex items-center justify-center gap-3 sm:gap-4">
        <ControlButton
          onClick={onToggleMic}
          danger={isMuted}
          disabled={!micReady}
          title={!micReady ? "Microphone unavailable" : isMuted ? "Unmute" : "Mute"}
          label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </ControlButton>

        <ControlButton
          onClick={onToggleTranscription}
          active={transcriptionEnabled}
          title={transcriptionEnabled ? "Turn off captions" : "Turn on captions"}
          label="Captions"
        >
          {transcriptionEnabled ? (
            <Captions className="w-5 h-5" />
          ) : (
            <CaptionsOff className="w-5 h-5" />
          )}
        </ControlButton>

        <ControlButton
          onClick={() => setShowReactions((v) => !v)}
          active={showReactions}
          title="Send a reaction"
          label="React"
        >
          <SmilePlus className="w-5 h-5" />
        </ControlButton>

        {/* Chat toggle (mobile only — sidebar hidden on small screens) */}
        <div className="sm:hidden">
          <ControlButton onClick={onToggleSidebar} title="Toggle panel" label="Panel">
            <MessageSquare className="w-5 h-5" />
          </ControlButton>
        </div>

        <div className="w-px h-8 bg-[var(--border)] mx-1" />

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onLeaveMeeting}
            title="Leave meeting"
            className="h-11 px-5 rounded-full bg-[var(--danger)] text-white flex items-center gap-2 text-sm font-semibold hover:opacity-90 transition"
          >
            <PhoneOff className="w-4 h-4" />
            Leave
          </button>
          <span className="text-[10px] text-transparent hidden sm:block">.</span>
        </div>

        {isHost && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onEndMeeting}
              disabled={isEndingMeeting}
              title="End meeting for everyone and generate the AI summary"
              className="h-11 px-4 rounded-full border border-[var(--danger)]/50 text-[var(--danger)] flex items-center gap-2 text-sm font-semibold hover:bg-[var(--danger-soft)] transition disabled:opacity-50"
            >
              {isEndingMeeting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ending…
                </>
              ) : (
                "End for all"
              )}
            </button>
            <span className="text-[10px] text-transparent hidden sm:block">.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlBar;
