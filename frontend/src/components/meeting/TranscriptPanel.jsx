import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Copy, Download, Check, Captions, Pause, Play } from "lucide-react";

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const GROUP_WINDOW_MS = 45 * 1000;

const highlight = (text, query) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--warning)]/40 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

/**
 * Professional live transcript: consecutive segments from the same
 * speaker merge into readable paragraphs, with search, copy,
 * download, and pausable auto-scroll.
 */
export default function TranscriptPanel({ transcripts, meetingTitle }) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);

  const grouped = useMemo(() => {
    const groups = [];
    for (const t of transcripts) {
      const last = groups[groups.length - 1];
      const withinWindow =
        last &&
        last.userName === t.userName &&
        new Date(t.timestamp) - new Date(last.endTime) < GROUP_WINDOW_MS;
      if (withinWindow) {
        last.text += " " + t.text;
        last.endTime = t.timestamp;
      } else {
        groups.push({
          id: t.id || `${t.userName}-${t.timestamp}`,
          userName: t.userName,
          text: t.text,
          startTime: t.timestamp,
          endTime: t.timestamp,
        });
      }
    }
    return groups;
  }, [transcripts]);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.toLowerCase();
    return grouped.filter(
      (g) => g.text.toLowerCase().includes(q) || g.userName.toLowerCase().includes(q)
    );
  }, [grouped, query]);

  useEffect(() => {
    if (!autoScroll || query) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [grouped, autoScroll, query]);

  const transcriptText = useMemo(
    () =>
      grouped
        .map((g) => `[${formatTime(g.startTime)}] ${g.userName}:\n${g.text}`)
        .join("\n\n"),
    [grouped]
  );

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(transcriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const header = `Transcript — ${meetingTitle || "Meeting"}\nExported ${new Date().toLocaleString()}\n${"=".repeat(48)}\n\n`;
    const blob = new Blob([header + transcriptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(meetingTitle || "meeting").replace(/[^\w-]+/g, "_")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* TOOLBAR */}
      <div className="px-4 pt-3 pb-2 space-y-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 transition"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyAll}
            disabled={grouped.length === 0}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-white/8 disabled:opacity-40 transition"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={download}
            disabled={grouped.length === 0}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-white/8 disabled:opacity-40 transition"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition ${
              autoScroll
                ? "text-[var(--success)] bg-[var(--success-soft)]"
                : "text-[var(--text-tertiary)] hover:bg-white/8"
            }`}
            title={autoScroll ? "Auto-scroll on" : "Auto-scroll paused"}
          >
            {autoScroll ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {autoScroll ? "Following" : "Paused"}
          </button>
        </div>
      </div>

      {/* TRANSCRIPT BODY */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-[var(--border)] flex items-center justify-center mb-3">
              <Captions className="w-5 h-5 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {query ? "No matches found" : "No transcript yet"}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {query
                ? "Try a different search term"
                : "Speech is transcribed automatically while your mic is on"}
            </p>
          </div>
        ) : (
          filtered.map((group) => (
            <div key={group.id} className="animate-fade-in-up">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-[var(--accent)]">
                  {group.userName}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                  {formatTime(group.startTime)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-primary)]/90">
                {highlight(group.text, query.trim())}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
