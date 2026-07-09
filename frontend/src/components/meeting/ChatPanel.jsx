import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Smile, AlertCircle, ArrowDown, Check } from "lucide-react";

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "👏", "😮", "😢", "🙏", "💯", "✅"];

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const GROUP_WINDOW_MS = 3 * 60 * 1000;

/**
 * Modern chat: bubble layout, sender grouping, delivery status,
 * typing indicator, emoji insert, and smart auto-scroll that only
 * follows when the user is already at the bottom.
 */
export default function ChatPanel({ messages, currentUser, onSend, onTyping, typingUsers }) {
  const [input, setInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const prevCountRef = useRef(messages.length);

  const grouped = useMemo(() => {
    const groups = [];
    for (const msg of messages) {
      const last = groups[groups.length - 1];
      const sameAuthor = last && last.userName === msg.userName && last.userId === msg.userId;
      const withinWindow =
        last &&
        new Date(msg.timestamp) - new Date(last.items[last.items.length - 1].timestamp) <
          GROUP_WINDOW_MS;
      if (sameAuthor && withinWindow) {
        last.items.push(msg);
      } else {
        groups.push({ userName: msg.userName, userId: msg.userId, items: [msg] });
      }
    }
    return groups;
  }, [messages]);

  const scrollToBottom = (behavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setPinnedToBottom(nearBottom);
    if (nearBottom) setUnseenCount(0);
  };

  useEffect(() => {
    const added = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    if (added <= 0) return;

    if (pinnedToBottom) {
      scrollToBottom();
    } else {
      setUnseenCount((c) => c + added);
    }
  }, [messages, pinnedToBottom]);

  const submit = (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
    setShowEmojis(false);
    setPinnedToBottom(true);
    requestAnimationFrame(() => scrollToBottom("auto"));
  };

  const insertEmoji = (emoji) => {
    setInput((v) => v + emoji);
    inputRef.current?.focus();
  };

  const othersTyping = typingUsers.filter(Boolean);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* MESSAGES */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
      >
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-[var(--border)] flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">No messages yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Messages are visible to everyone in the meeting
            </p>
          </div>
        ) : (
          grouped.map((group, gi) => {
            const isSelf = group.userId && group.userId === currentUser?._id;
            return (
              <div
                key={gi}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"} animate-fade-in-up`}
              >
                <div className="flex items-baseline gap-2 px-1 mb-1">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {isSelf ? "You" : group.userName}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {formatTime(group.items[0].timestamp)}
                  </span>
                </div>
                <div className={`flex flex-col gap-0.5 max-w-[85%] ${isSelf ? "items-end" : "items-start"}`}>
                  {group.items.map((msg) => (
                    <div
                      key={msg.clientId || msg.id}
                      className={`px-3.5 py-2 text-sm leading-relaxed break-words rounded-2xl ${
                        isSelf
                          ? "bg-[var(--accent)] text-white rounded-br-md"
                          : "bg-white/8 text-[var(--text-primary)] rounded-bl-md"
                      } ${msg.status === "failed" ? "opacity-60" : ""}`}
                    >
                      {msg.message}
                      {isSelf && (
                        <span className="inline-flex ml-1.5 align-middle">
                          {msg.status === "sending" ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-pulse" />
                          ) : msg.status === "failed" ? (
                            <AlertCircle className="w-3 h-3 text-white/80" />
                          ) : (
                            <Check className="w-3 h-3 text-white/70" />
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NEW MESSAGES PILL */}
      {!pinnedToBottom && unseenCount > 0 && (
        <button
          onClick={() => {
            setPinnedToBottom(true);
            setUnseenCount(0);
            scrollToBottom();
          }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg"
        >
          <ArrowDown className="w-3 h-3" />
          {unseenCount} new
        </button>
      )}

      {/* TYPING INDICATOR */}
      <div className="h-6 px-4 flex items-center">
        {othersTyping.length > 0 && (
          <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)] animate-bounce" />
              <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:120ms]" />
              <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:240ms]" />
            </span>
            {othersTyping.length === 1
              ? `${othersTyping[0]} is typing…`
              : `${othersTyping.length} people are typing…`}
          </p>
        )}
      </div>

      {/* EMOJI ROW */}
      {showEmojis && (
        <div className="px-4 pb-2 flex flex-wrap gap-1 animate-fade-in-up">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="h-8 w-8 rounded-lg hover:bg-white/10 text-lg flex items-center justify-center transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
        <form onSubmit={submit} className="flex items-end gap-2 mt-3">
          <button
            type="button"
            onClick={() => setShowEmojis((v) => !v)}
            className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition ${
              showEmojis
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-tertiary)] hover:bg-white/8 hover:text-[var(--text-secondary)]"
            }`}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onTyping?.();
            }}
            placeholder="Send a message…"
            maxLength={4000}
            className="flex-1 h-10 px-3.5 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 focus:bg-white/8 transition"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-10 w-10 shrink-0 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center transition hover:opacity-90 disabled:opacity-30"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
