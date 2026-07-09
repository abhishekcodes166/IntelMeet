import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import {
  Video,
  Keyboard,
  ArrowRight,
  AlertCircle,
  Captions,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setError("");

    const title = meetingTitle.trim();
    if (!title) {
      setError("Give your meeting a title to get started.");
      return;
    }

    setCreating(true);
    try {
      const response = await api.post("/meetings/create", { title });
      if (response.data.success) {
        navigate(`/meeting/${response.data.meeting.meetingCode}`);
      } else {
        setError(response.data.message || "Failed to create meeting.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not reach the server. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    setError("");

    const cleanCode = meetingCode.trim().toUpperCase();
    if (!cleanCode) {
      setError("Enter a meeting code to join.");
      return;
    }

    setJoining(true);
    try {
      const response = await api.post("/meetings/join", { meetingCode: cleanCode });
      if (response.data.success) {
        navigate(`/meeting/${cleanCode}`);
      } else {
        setError(response.data.message || "Failed to join meeting.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or inactive meeting code.");
    } finally {
      setJoining(false);
    }
  };

  const firstName = user?.fullName?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const features = [
    {
      icon: Captions,
      title: "Live transcription",
      text: "Every word captured automatically while you talk.",
    },
    {
      icon: Sparkles,
      title: "AI meeting notes",
      text: "Structured summaries, decisions, and action items after every call.",
    },
    {
      icon: ShieldCheck,
      title: "Private by design",
      text: "Coded rooms, authenticated access, encrypted media.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      {/* HERO */}
      <div className="max-w-2xl">
        <p className="text-sm text-[var(--text-tertiary)]">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          Meetings that write their own notes
        </h1>
        <p className="mt-3 text-base text-[var(--text-secondary)] leading-relaxed">
          Start an audio meeting with live transcription and get an AI summary the moment
          it ends — decisions, action items, and next steps included.
        </p>
      </div>

      {/* ACTION CARDS */}
      <div className="mt-10 grid gap-4 md:grid-cols-2 max-w-3xl">
        {/* NEW MEETING */}
        <form
          onSubmit={handleCreateMeeting}
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 transition hover:border-[var(--border-strong)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <Video className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="mt-4 text-base font-semibold">New meeting</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Start an instant room and invite your team.
          </p>
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="Meeting title"
            maxLength={200}
            className="mt-4 w-full h-11 px-4 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 transition"
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-3 w-full h-11 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                Start meeting
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* JOIN MEETING */}
        <form
          onSubmit={handleJoinMeeting}
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 transition hover:border-[var(--border-strong)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8">
            <Keyboard className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <h2 className="mt-4 text-base font-semibold">Join with a code</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Enter the code shared by the meeting host.
          </p>
          <input
            type="text"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
            placeholder="e.g. 4F2A9C"
            maxLength={12}
            className="mt-4 w-full h-11 px-4 rounded-xl bg-white/5 border border-[var(--border)] text-sm font-mono tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-[var(--accent)]/60 transition"
          />
          <button
            type="submit"
            disabled={joining}
            className="mt-3 w-full h-11 rounded-xl border border-[var(--border-strong)] text-[var(--text-primary)] text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining…
              </>
            ) : (
              "Join meeting"
            )}
          </button>
        </form>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-4 max-w-3xl flex items-center gap-3 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger)] animate-fade-in-up">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* FEATURES */}
      <div className="mt-16 grid gap-4 sm:grid-cols-3 max-w-4xl">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-2xl border border-[var(--border)] p-5">
              <Icon className="h-5 w-5 text-[var(--text-tertiary)]" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-tertiary)] leading-relaxed">
                {f.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Home;
