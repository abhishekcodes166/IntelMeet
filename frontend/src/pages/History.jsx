import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  Users,
  Clock,
  FileText,
  ChevronRight,
  Download,
  BookOpen,
  MessageSquare,
  BarChart2,
  CalendarDays,
  AlertCircle,
  Sparkles,
} from "lucide-react";

function History() {
  useAuth();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [transcriptQuery, setTranscriptQuery] = useState("");

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/meetings/my-meetings");
      if (response.data.success) {
        setMeetings(response.data.meetings);
      } else {
        setError("Failed to load meetings");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingDetails = async (meetingCode) => {
    try {
      setSelectedMeetingId(meetingCode);
      setDetailLoading(true);
      setMeetingDetails(null);
      const response = await axios.get(`/meetings/${meetingCode}/details`);
      if (response.data.success) {
        setMeetingDetails(response.data);
      } else {
        setError("Could not load meeting details");
      }
    } catch (err) {
      console.error(err);
      setError("Meeting details failed to load");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let text = "";
    if (h > 0) text += `${h}h `;
    if (m > 0) text += `${m}m `;
    if (s > 0) text += `${s}s`;
    return text.trim() || "0s";
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.meetingCode?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (selectedDate) {
      const dateStr = new Date(meeting.startTime).toISOString().split("T")[0];
      matchesDate = dateStr === selectedDate;
    }

    let matchesParticipant = true;
    if (selectedParticipant) {
      matchesParticipant = meeting.participants?.some((participant) =>
        participant.fullName?.toLowerCase().includes(selectedParticipant.toLowerCase())
      );
    }

    return matchesSearch && matchesDate && matchesParticipant;
  });

  const exportAsTxt = () => {
    if (!meetingDetails) return;
    const { meeting, transcripts, summary } = meetingDetails;
    let text = ``;
    text += `Meeting: ${meeting?.title}\n`;
    text += `Code: ${meeting?.meetingCode}\n`;
    text += `Date: ${formatDate(meeting?.startTime)}\n\n`;
    text += `SUMMARY\n`;
    text += `===================\n`;
    text += summary?.shortSummary || "No summary";
    text += `\n\nTRANSCRIPT\n`;
    text += `===================\n`;
    transcripts?.forEach((t) => {
      text += `[${new Date(t.timestamp).toLocaleTimeString()}] `;
      text += `${t.userName}: ${t.text}\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting?.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#040506] text-[#ffffff] px-6 py-10">
      <div className="mx-auto max-w-[1440px] space-y-10">
        <section className="rounded-[20px] bg-[#07080a]/95 border border-[#ffffff]/10 p-[32px] shadow-none">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 rounded-[6px] bg-[#1b1c1e] px-4 py-2 text-[12px] font-semibold uppercase text-[#ffffff] tracking-[0.04em]">
              <Sparkles className="h-4 w-4" />
              Meeting Intelligence
            </div>
            <div className="space-y-3">
              <h1 className="text-[54px] font-semibold tracking-[-0.08em] leading-[0.85] text-[#ffffff]">
                Meeting Intelligence Dashboard
              </h1>
              <p className="max-w-3xl text-[18px] leading-[1.4] tracking-[-0.36px] text-[#ffffff]/80">
                Review AI summaries, transcripts, analytics, and meeting history in a polished, expressive workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[16px] bg-[#07080a]/95 border border-[#ffffff]/10 p-[26px]">
            <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr] items-center">
              <div className="space-y-4">
                <h2 className="text-[22px] font-black tracking-[-0.44px]">Filter and review meetings</h2>
                <p className="text-[15px] leading-[1.5] text-[#ffffff]/75">
                  Search by title, date, or participant to quickly locate the meeting you need.
                </p>
              </div>
              <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214] p-5 text-[#ffffff]">
                <p className="text-[13px] uppercase tracking-[0.14px] text-[#ffffff]/80 font-semibold">Recent volume</p>
                <p className="mt-4 text-[32px] font-black tracking-[-0.72px]">{meetings.length}</p>
                <p className="mt-2 text-[14px] leading-[1.5] text-[#ffffff]/80">Meetings loaded from your account.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
              <div className="rounded-[16px] bg-[#040506]/90 border border-[#ffffff]/10 p-[20px]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffffff]/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search meetings..."
                    className="w-full rounded-[8px] border border-[#ffffff]/10 bg-[#040506] py-3 pl-12 pr-4 text-sm text-[#ffffff] placeholder-[#ffffff]/40 outline-none focus:border-[#e6e6e6] focus:ring-2 focus:ring-[#e6e6e6]/15"
                  />
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[16px] bg-[#040506]/90 border border-[#ffffff]/10 p-[20px]">
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffffff]/50" />
                    <input
                      type="text"
                      value={selectedParticipant}
                      onChange={(e) => setSelectedParticipant(e.target.value)}
                      placeholder="Participant..."
                      className="w-full rounded-[8px] border border-[#ffffff]/10 bg-[#040506] py-3 pl-12 pr-4 text-sm text-[#ffffff] placeholder-[#ffffff]/40 outline-none focus:border-[#e6e6e6] focus:ring-2 focus:ring-[#e6e6e6]/15"
                    />
                  </div>
                </div>
                <div className="rounded-[16px] bg-[#040506]/90 border border-[#ffffff]/10 p-[20px]">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffffff]/50" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-[8px] border border-[#ffffff]/10 bg-[#040506] py-3 pl-12 pr-4 text-sm text-[#ffffff] outline-none focus:border-[#e6e6e6] focus:ring-2 focus:ring-[#e6e6e6]/15"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDate("");
                setSelectedParticipant("");
              }}
              className="mt-6 inline-flex items-center justify-center rounded-[8px] border border-[#ffffff]/10 bg-transparent px-[25.848px] py-3 text-sm font-semibold text-[#ffffff] transition hover:bg-[#ffffff]/5"
            >
              Reset filters
            </button>

            {error && (
              <div className="mt-6 rounded-[16px] border border-[#ff6363]/20 bg-[#ff6363]/10 px-5 py-4 text-[#ff6363]">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[16px] bg-[#111214] p-[26px] text-[#ffffff] border border-[#ffffff]/10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-[6px] bg-[#1b1c1e] px-4 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-[#ffffff]">
                <CalendarDays className="h-4 w-4" />
                Quick insights
              </div>
              <div className="space-y-3">
                <div className="rounded-[8px] bg-[#ffffff]/5 p-4">
                  <p className="text-[15px] font-semibold">Total meetings</p>
                  <p className="mt-3 text-[28px] font-black tracking-[-0.72px]">{meetings.length}</p>
                </div>
                <div className="rounded-[8px] bg-[#ffffff]/5 p-4">
                  <p className="text-[15px] font-semibold">Selected date</p>
                  <p className="mt-3 text-[18px] text-[#9c9c9d]">{selectedDate || "All dates"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {loading ? (
            <div className="rounded-[16px] bg-[#040506]/95 border border-[#ffffff]/10 p-[40px] text-center">
              <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <p className="text-[16px] text-[#ffffff]/70">Loading meeting history...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="rounded-[16px] bg-[#040506]/95 border border-[#ffffff]/10 p-[40px] text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-[#ffffff]/50" />
              <h3 className="text-[22px] font-bold text-[#ffffff]">No meetings found</h3>
              <p className="mt-2 text-[15px] text-[#ffffff]/65">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredMeetings.map((meeting) => (
                <button
                  key={meeting._id}
                  onClick={() => loadMeetingDetails(meeting.meetingCode)}
                  className="group w-full rounded-[16px] border border-[#ffffff]/10 bg-[#040506]/90 p-[26px] text-left transition hover:border-[#e6e6e6] hover:bg-[#040506]/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-[22px] font-black tracking-[-0.44px] text-[#ffffff]">{meeting.title}</h3>
                        <span className="rounded-[8px] border border-[#ffffff]/10 bg-[#ffffff]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14px] text-[#ffffff]/80">
                          {meeting.meetingCode}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[13px] text-[#ffffff]/70">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(meeting.startTime)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatDuration(meeting.duration)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {meeting.participants?.length || 0} participants
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#e6e6e6] transition group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <AnimatePresence>
          {selectedMeetingId && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 22 }}
                className="absolute right-0 top-0 h-full w-full max-w-4xl overflow-hidden bg-[#040506] text-[#ffffff] shadow-2xl"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-[#ffffff]/10 p-6">
                    <div>
                      <p className="text-[13px] uppercase tracking-[0.14px] text-[#9c9c9d] font-semibold">Meeting details</p>
                      <h2 className="mt-3 text-[28px] font-black tracking-[-0.44px] text-[#ffffff]">
                        {meetingDetails?.meeting?.title}
                      </h2>
                      <p className="mt-2 text-sm text-[#9c9c9d]">{meetingDetails?.meeting?.meetingCode}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeetingId(null);
                        setMeetingDetails(null);
                      }}
                      className="rounded-[8px] border border-[#ffffff]/10 bg-[#111214] px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#1b1c1e]"
                    >
                      Close
                    </button>
                  </div>

                  {detailLoading ? (
                    <div className="flex-1 items-center justify-center p-10 text-center">
                      <div className="mx-auto mb-6 h-14 w-14 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                      <p className="text-[#9c9c9d]">Loading meeting details...</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                      <div className="grid gap-6 xl:grid-cols-3">
                        <div className="rounded-[16px] bg-[#111214]/95 border border-[#ffffff]/10 p-[26px]">
                          <p className="text-[13px] uppercase tracking-[0.14px] text-[#9c9c9d] font-semibold">Summary</p>
                          <p className="mt-4 text-[18px] font-black tracking-[-0.36px]">Quick overview</p>
                          <p className="mt-3 text-[14px] leading-[1.6] text-[#ffffff]/80">
                            {meetingDetails?.summary?.shortSummary || "No AI summary generated yet."}
                          </p>
                        </div>
                        <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214] p-[26px] text-[#ffffff]">
                          <p className="text-[13px] uppercase tracking-[0.14px] text-[#ffffff]/80 font-semibold">Focus points</p>
                          <p className="mt-4 text-[18px] font-black tracking-[-0.36px]">Key takeaways</p>
                          <p className="mt-3 text-[14px] leading-[1.6] text-[#ffffff]/80">Expand the bullets below for a closer look at the meeting highlights.</p>
                        </div>
                        <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214] p-[26px] text-[#ffffff]">
                          <p className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.14px] text-[#ffffff]/80 font-semibold">
                            <span className="h-2 w-2 rounded-full bg-[#59d499]" />
                            Analytics
                          </p>
                          <p className="mt-4 text-[18px] font-black tracking-[-0.36px]">Participation</p>
                          <p className="mt-3 text-[14px] leading-[1.6] text-[#ffffff]/80">Review speaking time, message counts, and contributor trends.</p>
                        </div>
                      </div>

                      {meetingDetails?.summary?.detailedSummary && (
                        <details className="group rounded-[16px] border border-[#ffffff]/10 bg-[#111214]/95 p-[26px]">
                          <summary className="flex cursor-pointer items-center justify-between text-[15px] font-semibold text-[#ffffff]">
                            <span className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-[#ff6363]" />
                              Detailed Summary
                            </span>
                            <ChevronRight className="h-4 w-4 text-[#9c9c9d] transition-transform group-open:rotate-90" />
                          </summary>
                          <div className="mt-5 space-y-4 text-[14px] leading-[1.8] text-[#ffffff]/80 whitespace-pre-line">
                            {meetingDetails.summary.detailedSummary}
                          </div>
                        </details>
                      )}

                      {meetingDetails?.summary?.bulletNotes?.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#ffffff]">
                            <FileText className="h-4 w-4 text-[#59d499]" />
                            Key Discussion Points
                          </div>
                          <div className="grid gap-3">
                            {meetingDetails.summary.bulletNotes.map((note, index) => (
                              <div key={index} className="rounded-[8px] border border-[#ffffff]/10 bg-[#111214]/95 p-4 text-[14px] text-[#ffffff]/90">
                                • {note}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-6">
                          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#ffffff]">
                            <MessageSquare className="h-4 w-4 text-[#ff6363]" />
                          Transcript Timeline
                        </div>
                        <div className="space-y-4">
                          {meetingDetails?.transcripts
                            ?.filter((t) => t.text?.toLowerCase().includes(transcriptQuery.toLowerCase()))
                            ?.map((transcript) => (
                              <div key={transcript._id} className="rounded-[8px] border border-[#ffffff]/10 bg-[#111214]/95 p-4">
                                <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#ffffff]/70">
                                  <span className="font-semibold text-[#ffffff]">{transcript.userName}</span>
                                  <span>{new Date(transcript.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="mt-2 text-[14px] leading-[1.75] text-[#ffffff]/90">{transcript.text}</p>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#ffffff]">
                            <BarChart2 className="h-4 w-4 text-[#59d499]" />
                          Participant Analytics
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {meetingDetails?.analytics?.map((analytics) => (
                            <div key={analytics._id} className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214]/95 p-[22px]">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <h4 className="text-[15px] font-semibold text-[#ffffff]">{analytics.userName}</h4>
                                  <p className="mt-2 text-[13px] text-[#ffffff]/70">Speaking Time: {formatDuration(analytics.speakingTime)}</p>
                                  <p className="mt-1 text-[13px] text-[#ffffff]/70">Messages: {analytics.messageCount}</p>
                                </div>
                                <div className="text-[28px] font-black text-[#111214]">{analytics.contributionPercentage}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#ffffff]/10 p-6 flex justify-end">
                    <button
                      onClick={exportAsTxt}
                      className="inline-flex items-center gap-2 rounded-[8px] bg-[#e6e6e6] px-5 py-3 text-sm font-semibold text-[#040506] transition hover:bg-[#ffffff]"
                    >
                      <Download className="h-4 w-4" />
                      Export TXT
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default History;
