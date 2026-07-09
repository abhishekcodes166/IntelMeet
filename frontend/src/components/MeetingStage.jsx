import { MicOff, UserPlus } from "lucide-react";

const getInitials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

// Grid sizing tuned per participant count, like Meet/Zoom
const gridClass = (count) => {
  if (count <= 1) return "grid-cols-1 max-w-sm";
  if (count === 2) return "grid-cols-2 max-w-2xl";
  if (count <= 4) return "grid-cols-2 max-w-3xl";
  if (count <= 9) return "grid-cols-3 max-w-4xl";
  return "grid-cols-4 max-w-5xl";
};

const ParticipantTile = ({ participant, isSpeaking }) => (
  <div
    className={`relative aspect-square sm:aspect-video rounded-2xl flex flex-col items-center justify-center gap-3 bg-[var(--bg-elevated)] border transition-all duration-300 animate-fade-in-up ${
      isSpeaking
        ? "border-[var(--success)]/70 shadow-[0_0_0_1px_var(--success)]"
        : "border-[var(--border)]"
    }`}
  >
    <div
      className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-lg font-bold text-white transition ${
        participant.isSelf ? "bg-[var(--accent)]" : "bg-white/12"
      } ${isSpeaking ? "speaking-ring" : ""}`}
    >
      {getInitials(participant.userName)}
    </div>

    {/* Name plate */}
    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[var(--text-primary)] bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-lg truncate">
        {participant.userName}
        {participant.isSelf && " (you)"}
      </span>
      {participant.isMuted && (
        <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--danger)]/85 flex items-center justify-center">
          <MicOff className="w-3 h-3 text-white" />
        </span>
      )}
    </div>

    {/* Speaking bars */}
    {isSpeaking && (
      <div className="absolute top-2.5 right-2.5 flex items-end gap-0.5 h-4">
        <span className="w-1 rounded-full bg-[var(--success)] animate-bounce h-2" />
        <span className="w-1 rounded-full bg-[var(--success)] animate-bounce h-3.5 [animation-delay:120ms]" />
        <span className="w-1 rounded-full bg-[var(--success)] animate-bounce h-2.5 [animation-delay:240ms]" />
      </div>
    )}
  </div>
);

const MeetingStage = ({ participants, speakingStatus, onInvite, captions }) => {
  const isAlone = participants.length <= 1;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center p-4 sm:p-6">
      {isAlone ? (
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-[var(--accent)] flex items-center justify-center text-2xl font-bold text-white">
            {getInitials(participants[0]?.userName)}
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Waiting for others to join
          </h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Share the room code or send an invite to get started
          </p>
          <button
            onClick={onInvite}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <UserPlus className="w-4 h-4" />
            Invite people
          </button>
        </div>
      ) : (
        <div className={`grid gap-3 w-full ${gridClass(participants.length)}`}>
          {participants.map((p) => (
            <ParticipantTile
              key={p.socketId || p.userId}
              participant={p}
              isSpeaking={!p.isMuted && speakingStatus[p.userId]}
            />
          ))}
        </div>
      )}

      {/* LIVE CAPTIONS (Google Meet style) */}
      {captions && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-[calc(100%-2rem)] pointer-events-none">
          <div className="glass rounded-xl px-4 py-2.5 text-center">
            <span className="text-xs font-semibold text-[var(--accent)] mr-2">
              {captions.userName}
            </span>
            <span className="text-sm text-[var(--text-primary)]/90">{captions.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingStage;
