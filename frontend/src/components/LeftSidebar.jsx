import { Users, MicOff, Crown, UserPlus } from "lucide-react";

const getInitials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

const LeftSidebar = ({ participants, speakingStatus, hostId, onInvite }) => {
  return (
    <div className="hidden lg:flex w-64 bg-[var(--bg-surface)] border-r border-[var(--border)] flex-col overflow-hidden">
      {/* HEADER */}
      <div className="px-4 h-12 flex items-center justify-between border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            People ({participants.length})
          </h3>
        </div>
        <button
          onClick={onInvite}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition"
        >
          <UserPlus className="w-3 h-3" />
          Invite
        </button>
      </div>

      {/* PARTICIPANTS */}
      <div className="flex-1 overflow-y-auto py-2">
        {participants.map((p) => {
          const isSpeaking = !p.isMuted && speakingStatus[p.userId];
          const isHost = hostId && p.userId === hostId;
          return (
            <div
              key={p.socketId || p.userId}
              className="mx-2 px-2 py-2 rounded-lg flex items-center gap-3 hover:bg-white/4 transition"
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  p.isSelf ? "bg-[var(--accent)]" : "bg-white/12"
                } ${isSpeaking ? "ring-2 ring-[var(--success)] speaking-ring" : ""}`}
              >
                {getInitials(p.userName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
                  {p.userName}
                  {p.isSelf && (
                    <span className="text-[var(--text-tertiary)] font-normal">(you)</span>
                  )}
                  {isHost && <Crown className="w-3 h-3 text-[var(--warning)] shrink-0" />}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {isSpeaking ? (
                    <span className="text-[var(--success)]">Speaking</span>
                  ) : p.isMuted ? (
                    "Muted"
                  ) : (
                    "In call"
                  )}
                </p>
              </div>
              {p.isMuted && <MicOff className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeftSidebar;
