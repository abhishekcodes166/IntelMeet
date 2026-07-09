import { useState } from "react";
import { X, Mail, Link2, Check, Loader2 } from "lucide-react";
import api from "../../lib/api";

/**
 * Invite people by email or by sharing the join link.
 * The inner form mounts fresh each time the modal opens, so
 * fields reset without any effect-driven state syncing.
 */
export default function InviteModal({ open, onClose, roomId, meetingTitle }) {
  if (!open) return null;
  return <InviteModalContent onClose={onClose} roomId={roomId} meetingTitle={meetingTitle} />;
}

function InviteModalContent({ onClose, roomId, meetingTitle }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null); // {tone, text}
  const [sending, setSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const joinLink = `${window.location.origin}/meeting/${roomId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || sending) return;

    setSending(true);
    setStatus(null);
    try {
      await api.post(`/meetings/${roomId}/invite`, {
        to: email.trim(),
        subject: meetingTitle ? `Invite: ${meetingTitle}` : "Meeting invite",
        message,
      });
      setStatus({ tone: "success", text: "Invite sent" });
      setEmail("");
      setMessage("");
      setTimeout(onClose, 1200);
    } catch (err) {
      setStatus({
        tone: "error",
        text: err.response?.data?.message || "Failed to send invite",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-lg animate-fade-in-up">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Invite people</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Share the link or send an email invitation
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-white/8 hover:text-[var(--text-primary)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* SHARE LINK */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Meeting link
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono flex items-center truncate">
                {joinLink}
              </div>
              <button
                onClick={copyLink}
                className="h-10 px-3.5 rounded-xl bg-white/8 border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-white/12 transition flex items-center gap-1.5 shrink-0"
              >
                {linkCopied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                {linkCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
              or email
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* EMAIL FORM */}
          <form onSubmit={sendInvite} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Recipient email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="mt-1.5 w-full h-10 px-3.5 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Message <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Join my meeting!"
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 transition resize-none"
              />
            </div>

            {status && (
              <div
                className={`text-xs font-medium px-3 py-2 rounded-lg ${
                  status.tone === "success"
                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                    : "bg-[var(--danger-soft)] text-[var(--danger)]"
                }`}
              >
                {status.text}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full h-10 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send invite
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
