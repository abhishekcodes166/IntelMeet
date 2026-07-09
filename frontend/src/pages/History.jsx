import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import {
  Search,
  Calendar,
  Users,
  Clock,
  FileText,
  ChevronRight,
  Download,
  MessageSquare,
  BarChart2,
  AlertCircle,
  Sparkles,
  X,
  ListChecks,
  Gavel,
  CalendarClock,
  HelpCircle,
  ArrowRightCircle,
  Flag,
  RefreshCw,
  Loader2,
  BookOpen,
  Video,
} from "lucide-react";

const formatDate = (date) => {
  if (!date) return "Unknown";
  return new Date(date).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// ============================================================
// AI SUMMARY — structured sections, Notion-AI style
// ============================================================

const SummarySection = ({ icon: Icon, title, items, tone = "default" }) => {
  if (!items || items.length === 0) return null;
  const toneColors = {
    default: "text-[var(--text-secondary)]",
    accent: "text-[var(--accent)]",
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    danger: "text-[var(--danger)]",
  };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${toneColors[tone]}`} />
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
        <span className="text-xs text-[var(--text-tertiary)]">({items.length})</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className={`mt-2 h-1 w-1 rounded-full shrink-0 ${toneColors[tone]} bg-current`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const AiSummary = ({ summary, hasTranscripts, onRetry, retrying }) => {
  const failed = !summary || summary.status === "FAILED";
  const empty = summary?.status === "EMPTY" || (!hasTranscripts && !summary?.shortSummary);

  if (empty) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-6 text-center">
        <Sparkles className="h-6 w-6 text-[var(--text-tertiary)] mx-auto mb-2" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          No transcript was captured
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          An AI summary needs a transcript — keep captions on during your next meeting.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-[var(--warning)]/25 bg-[var(--warning)]/5 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-[var(--warning)] mx-auto mb-2" />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Summary not generated yet
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          The AI summary for this meeting is missing or failed. You can generate it now.
        </p>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {retrying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Generate summary
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* OVERVIEW */}
      {summary.shortSummary && (
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Meeting Overview</h4>
          </div>
          <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed">
            {summary.shortSummary}
          </p>
        </div>
      )}

      {/* DETAILED */}
      {summary.detailedSummary && (
        <details className="group rounded-xl border border-[var(--border)] bg-white/[0.02] p-5">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[var(--text-primary)] list-none">
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--text-secondary)]" />
              Detailed Summary
            </span>
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
            {summary.detailedSummary}
          </div>
        </details>
      )}

      <SummarySection icon={FileText} title="Key Discussion Points" items={summary.bulletNotes} />
      <SummarySection icon={Gavel} title="Decisions Made" items={summary.decisions} tone="success" />
      <SummarySection icon={ListChecks} title="Action Items" items={summary.actionItems} tone="accent" />
      <SummarySection icon={CalendarClock} title="Important Deadlines" items={summary.deadlines} tone="warning" />
      <SummarySection icon={HelpCircle} title="Questions Raised" items={summary.questions} />
      <SummarySection icon={ArrowRightCircle} title="Next Steps" items={summary.nextSteps} tone="accent" />

      {summary.conclusion && (
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-4 w-4 text-[var(--text-secondary)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Conclusion</h4>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {summary.conclusion}
          </p>
        </div>
      )}

      {summary.participantContributions && (
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-[var(--text-secondary)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Participant Contributions
            </h4>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {summary.participantContributions}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================
// SKELETON
// ============================================================
const MeetingSkeleton = () => (
  <div className="rounded-2xl border border-[var(--border)] p-5">
    <div className="skeleton h-5 w-1/3 rounded-md" />
    <div className="mt-3 flex gap-4">
      <div className="skeleton h-3.5 w-32 rounded-md" />
      <div className="skeleton h-3.5 w-16 rounded-md" />
      <div className="skeleton h-3.5 w-24 rounded-md" />
    </div>
  </div>
);

// ============================================================
// HISTORY PAGE
// ============================================================
function History() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMeetingCode, setSelectedMeetingCode] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [retrying, setRetrying] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      const response = await api.get("/meetings/my-meetings");
      if (response.data.success) {
        setMeetings(response.data.meetings);
      } else {
        setError("Failed to load meetings");
      }
    } catch {
      setError("Could not load your meeting history. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetch on mount — every setState inside happens after an await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMeetings();
  }, [fetchMeetings]);

  const loadDetails = async (meetingCode) => {
    setSelectedMeetingCode(meetingCode);
    setDetailLoading(true);
    setDetails(null);
    setTranscriptQuery("");
    try {
      const response = await api.get(`/meetings/${meetingCode}/details`);
      if (response.data.success) {
        setDetails(response.data);
      }
    } catch {
      setError("Could not load meeting details");
      setSelectedMeetingCode(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const retrySummary = async () => {
    if (!selectedMeetingCode || retrying) return;
    setRetrying(true);
    try {
      const res = await api.post("/meetings/generate-summary", {
        roomId: selectedMeetingCode,
      });
      if (res.data.success) {
        setDetails((prev) => (prev ? { ...prev, summary: res.data.summary } : prev));
      }
    } catch {
      setDetails((prev) =>
        prev
          ? { ...prev, summary: { ...(prev.summary || {}), status: "FAILED" } }
          : prev
      );
    } finally {
      setRetrying(false);
    }
  };

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((meeting) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          meeting.title?.toLowerCase().includes(q) ||
          meeting.meetingCode?.toLowerCase().includes(q) ||
          meeting.participants?.some((p) => p.fullName?.toLowerCase().includes(q));

        let matchesDate = true;
        if (selectedDate && meeting.startTime) {
          matchesDate =
            new Date(meeting.startTime).toISOString().split("T")[0] === selectedDate;
        }
        return matchesSearch && matchesDate;
      }),
    [meetings, searchQuery, selectedDate]
  );

  const filteredTranscripts = useMemo(() => {
    const list = details?.transcripts || [];
    const q = transcriptQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.text?.toLowerCase().includes(q) || t.userName?.toLowerCase().includes(q)
    );
  }, [details, transcriptQuery]);

  const exportAsTxt = () => {
    if (!details) return;
    const { meeting, transcripts, summary } = details;
    const lines = [
      `Meeting: ${meeting?.title}`,
      `Code: ${meeting?.meetingCode}`,
      `Date: ${formatDate(meeting?.startTime)}`,
      "",
      "AI SUMMARY",
      "=".repeat(48),
      summary?.shortSummary || "No summary",
      "",
    ];
    const addSection = (title, items) => {
      if (items?.length) {
        lines.push(title, "-".repeat(32), ...items.map((i) => `• ${i}`), "");
      }
    };
    addSection("KEY POINTS", summary?.bulletNotes);
    addSection("DECISIONS", summary?.decisions);
    addSection("ACTION ITEMS", summary?.actionItems);
    addSection("DEADLINES", summary?.deadlines);
    addSection("NEXT STEPS", summary?.nextSteps);
    lines.push("TRANSCRIPT", "=".repeat(48));
    transcripts?.forEach((t) => {
      lines.push(`[${new Date(t.timestamp).toLocaleTimeString()}] ${t.userName}: ${t.text}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(meeting?.title || "meeting").replace(/[^\w-]+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Meeting history
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            AI summaries, transcripts, and analytics for every meeting.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings…"
              className="h-10 w-56 pl-9 pr-3 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 transition"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]/60 transition [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger)]">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              fetchMeetings();
            }}
            className="text-xs font-semibold underline underline-offset-2 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* LIST */}
      <div className="mt-8 space-y-3">
        {loading ? (
          <>
            <MeetingSkeleton />
            <MeetingSkeleton />
            <MeetingSkeleton />
          </>
        ) : filteredMeetings.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] p-12 text-center">
            <Video className="mx-auto mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
            <h3 className="text-base font-semibold">
              {meetings.length === 0 ? "No meetings yet" : "No matches"}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              {meetings.length === 0
                ? "Start your first meeting from the home page."
                : "Try adjusting your search or date filter."}
            </p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <button
              key={meeting._id}
              onClick={() => loadDetails(meeting.meetingCode)}
              className="group w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left transition hover:border-[var(--border-strong)] hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                      {meeting.title}
                    </h3>
                    <span className="rounded-md bg-white/6 border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-tertiary)]">
                      {meeting.meetingCode}
                    </span>
                    {meeting.meetingStatus === "ONGOING" && (
                      <span className="flex items-center gap-1.5 rounded-md bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                        <span className="h-1 w-1 rounded-full bg-[var(--success)] animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(meeting.startTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatDuration(meeting.duration)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {meeting.participants?.length || 0} participant
                      {(meeting.participants?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)] shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* DETAILS DRAWER */}
      <AnimatePresence>
        {selectedMeetingCode && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedMeetingCode(null);
                setDetails(null);
              }
            }}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute right-0 top-0 h-full w-full max-w-3xl bg-[var(--bg-base)] border-l border-[var(--border)] shadow-lg flex flex-col"
            >
              {/* DRAWER HEADER */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5 shrink-0">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold">
                    Meeting details
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)] truncate">
                    {details?.meeting?.title || "Loading…"}
                  </h2>
                  {details?.meeting && (
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                      <span className="font-mono">{details.meeting.meetingCode}</span>
                      <span>{formatDate(details.meeting.startTime)}</span>
                      <span>{formatDuration(details.meeting.duration)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={exportAsTxt}
                    disabled={!details}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/5 transition disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMeetingCode(null);
                      setDetails(null);
                    }}
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-white/8 hover:text-[var(--text-primary)] transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* DRAWER BODY */}
              {detailLoading ? (
                <div className="flex-1 p-6 space-y-4">
                  <div className="skeleton h-24 rounded-xl" />
                  <div className="skeleton h-40 rounded-xl" />
                  <div className="skeleton h-40 rounded-xl" />
                </div>
              ) : (
                details && (
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                    {/* AI SUMMARY */}
                    <section>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-4">
                        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                        AI Summary
                      </h3>
                      <AiSummary
                        summary={details.summary}
                        hasTranscripts={(details.transcripts || []).length > 0}
                        onRetry={retrySummary}
                        retrying={retrying}
                      />
                    </section>

                    {/* TRANSCRIPT */}
                    {(details.transcripts || []).length > 0 && (
                      <section>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                            <MessageSquare className="h-4 w-4 text-[var(--text-secondary)]" />
                            Transcript
                            <span className="text-xs font-normal text-[var(--text-tertiary)]">
                              ({details.transcripts.length} segments)
                            </span>
                          </h3>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-tertiary)]" />
                            <input
                              type="text"
                              value={transcriptQuery}
                              onChange={(e) => setTranscriptQuery(e.target.value)}
                              placeholder="Search…"
                              className="h-8 w-40 pl-8 pr-2 rounded-lg bg-white/5 border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 transition"
                            />
                          </div>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto rounded-xl border border-[var(--border)] p-4">
                          {filteredTranscripts.length === 0 ? (
                            <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                              No matching transcript segments
                            </p>
                          ) : (
                            filteredTranscripts.map((t) => (
                              <div key={t._id}>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-semibold text-[var(--accent)]">
                                    {t.userName}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                                    {new Date(t.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                                  {t.text}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    )}

                    {/* ANALYTICS */}
                    {(details.analytics || []).length > 0 && (
                      <section>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-4">
                          <BarChart2 className="h-4 w-4 text-[var(--text-secondary)]" />
                          Participation
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {details.analytics.map((a) => (
                            <div
                              key={a._id}
                              className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  {a.userName}
                                </p>
                                <span className="text-sm font-bold text-[var(--accent)]">
                                  {a.contributionPercentage}%
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 rounded-full bg-white/6 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                                  style={{ width: `${a.contributionPercentage}%` }}
                                />
                              </div>
                              <div className="mt-3 flex gap-4 text-xs text-[var(--text-tertiary)]">
                                <span>Speaking: {formatDuration(a.speakingTime)}</span>
                                <span>Messages: {a.messageCount || 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default History;
