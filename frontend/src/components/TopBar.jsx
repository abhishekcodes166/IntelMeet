import { Copy, Check, Users, Clock, Captions } from "lucide-react";

const formatElapsed = (seconds) => {
  if (seconds == null || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const TopBar = ({
  meetingTitle,
  roomId,
  copied,
  onCopyRoom,
  elapsedSeconds,
  participantCount,
  transcriptionEnabled,
}) => {
  return (
    <div className="shrink-0 z-30 bg-[var(--bg-base)] border-b border-[var(--border)]">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* LEFT: Logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--accent)] text-white font-bold text-sm shrink-0">
            IM
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {meetingTitle || "Meeting"}
            </h1>
            <button
              onClick={onCopyRoom}
              className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition font-mono"
              title="Copy room code"
            >
              {roomId}
              {copied ? (
                <Check className="w-3 h-3 text-[var(--success)]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* RIGHT: live status */}
        <div className="flex items-center gap-2">
          {transcriptionEnabled && (
            <div
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]"
              title="Live transcription active"
            >
              <Captions className="w-3.5 h-3.5" />
              CC
            </div>
          )}
          <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
            <Users className="w-3.5 h-3.5" />
            {participantCount}
          </div>
          <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)] animate-pulse" />
            <Clock className="w-3.5 h-3.5" />
            {formatElapsed(elapsedSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
