import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ArrowRight,
  Sparkles,
  Video,
  Keyboard,
  LogIn,
  AlertCircle,
} from "lucide-react";

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setError("");

    const title = meetingTitle.trim();
    if (!title) {
      setError("Please enter a meeting title before starting.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/meetings/create", { title });
      if (response.data.success) {
        const { meetingCode: code } = response.data.meeting;
        navigate(`/meeting/${code}`);
      } else {
        setError(response.data.message || "Failed to create meeting.");
      }
    } catch (err) {
      console.error("Create meeting error:", err);
      setError(err.response?.data?.message || "Server error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanCode = meetingCode.trim().toUpperCase();

    if (!cleanCode) {
      setError("Please enter a meeting code.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("/meetings/join", { meetingCode: cleanCode });
      if (response.data.success) {
        navigate(`/meeting/${cleanCode}`);
      } else {
        setError(response.data.message || "Failed to join meeting.");
      }
    } catch (err) {
      console.error("Join meeting error:", err);
      setError(err.response?.data?.message || "Invalid or inactive meeting code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#fdf9f0]">
      <section className="relative overflow-hidden py-20">
        <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#7a78ff]/15 blur-3xl" />
        <div className="absolute left-0 top-40 h-44 w-44 rounded-full bg-[#00a652]/15 blur-3xl" />

        <div className="mx-auto grid max-w-[1440px] gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-[1000px] bg-[#c7ff69] px-4 py-2 text-[14px] font-semibold text-[#141414] tracking-[0.14px]">
              <Sparkles className="h-4 w-4" />
              AI-powered meeting intelligence
            </div>

            <div className="space-y-6">
              <h1 className="text-display font-black tracking-[-0.04em] leading-[0.8] text-[#fdf9f0] sm:text-[7.5rem]">
                Welcome to the Intel Meet
              </h1>
              <p className="max-w-xl text-[18px] leading-[1.2] tracking-[-0.36px] text-[#fdf9f0]/80">
                Instant summaries, live analytics, and secure room codes—designed to keep your team aligned with zero friction.
              </p>
            </div>

            <form onSubmit={handleCreateMeeting} className="grid gap-4">
              <div className="grid gap-3 rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#141414]/90 p-4">
                <label className="text-[13px] uppercase tracking-[0.14px] text-[#c7ff69] font-medium" htmlFor="meetingTitle">
                  Meeting title
                </label>
                <input
                  id="meetingTitle"
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title"
                  className="w-full rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414] px-5 py-3 text-[14px] text-[#fdf9f0] placeholder-[#fdf9f0]/40 outline-none focus:border-[#c7ff69] focus:ring-2 focus:ring-[#c7ff69]/15"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-[25.146px] bg-[#c7ff69] px-[25.848px] py-2.5 text-[14px] font-semibold text-[#141414] transition hover:bg-[#b9f25f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Starting…" : "Start meeting"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </form>

            <motion.form
              onSubmit={handleJoinMeeting}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid gap-4 rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#141414]/90 p-[26px]"
            >
              <div className="space-y-2">
                <p className="text-[13px] uppercase tracking-[0.14px] text-[#c7ff69] font-medium">
                  Join a room instantly
                </p>
                <p className="text-[18px] leading-[1.2] tracking-[-0.36px] text-[#fdf9f0]/80">
                  Paste your meeting code and hop into the next call.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="text"
                  placeholder="Enter meeting code"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  className="min-w-0 flex-1 rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414] px-5 py-3 text-[14px] font-medium text-[#fdf9f0] placeholder-[#fdf9f0]/40 outline-none focus:border-[#c7ff69] focus:ring-2 focus:ring-[#c7ff69]/15"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[25.146px] bg-[#c7ff69] px-[25.848px] py-3 text-[14px] font-semibold text-[#141414] transition hover:bg-[#b9f25f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Joining…" : "Join with code"}
                </button>
              </div>
            </motion.form>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-[43.2px] border border-[#ff6d38]/20 bg-[#ff6d38]/10 px-5 py-4 text-[#ff6d38]"
              >
                <AlertCircle className="h-5 w-5" />
                <span className="text-[14px] font-medium">{error}</span>
              </motion.div>
            )}
          </div>

          <div className="relative grid gap-6">
            <div className="rounded-[43.2px] bg-[#7a78ff] p-[26px] text-[#fdf9f0]">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex rounded-[1000px] bg-[#fdf9f0]/10 px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.14px]">
                  Live intelligence
                </span>
                <span className="inline-flex items-center gap-2 rounded-[20.7px] bg-[#ffffff]/10 px-3 py-2 text-[13px] font-semibold text-[#fdf9f0]/90">
                  <Sparkles className="h-4 w-4" />
                  New
                </span>
              </div>
              <div className="mt-10 space-y-4">
                <div className="rounded-[25.146px] bg-[#ffffff]/10 p-5">
                  <p className="text-[18px] font-semibold tracking-[-0.36px]">Record every moment</p>
                  <p className="mt-2 text-[14px] leading-[1.4] text-[#fdf9f0]/80">
                    Auto transcript capture keeps your team aligned without manual note taking.
                  </p>
                </div>
                <div className="rounded-[25.146px] bg-[#ffffff]/10 p-5">
                  <p className="text-[18px] font-semibold tracking-[-0.36px]">Instant action items</p>
                  <p className="mt-2 text-[14px] leading-[1.4] text-[#fdf9f0]/80">
                    Extract decisions and follow-ups as the call unfolds.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[43.2px] bg-[#00a652] p-[26px] text-[#fdf9f0]">
                <p className="text-[14px] uppercase tracking-[0.14px] text-[#fdf9f0]/80">
                  Quick stats
                </p>
                <p className="mt-4 text-[24px] font-black tracking-[-0.72px]">98%</p>
                <p className="mt-2 text-[14px] leading-[1.4] text-[#fdf9f0]/80">Call retention with instant summaries.</p>
              </div>
              <div className="rounded-[43.2px] bg-[#ccccff] p-[26px] text-[#141414]">
                <p className="text-[14px] uppercase tracking-[0.14px] text-[#141414]/80">
                  Safe by design
                </p>
                <p className="mt-4 text-[24px] font-black tracking-[-0.72px]">End-to-end</p>
                <p className="mt-2 text-[14px] leading-[1.4] text-[#141414]/80">Encrypted rooms and user-controlled access.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[43.2px] bg-[#7a78ff] p-[26px] text-[#fdf9f0]">
            <p className="text-[16px] font-semibold uppercase tracking-[0.14px] text-[#fdf9f0]/80">Amethyst Glow</p>
            <h2 className="mt-4 text-[22px] font-black tracking-[-0.44px]">Playful meeting decks</h2>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#fdf9f0]/80">Create a lively atmosphere for every sync with colorful status summaries and insights.</p>
          </div>
          <div className="rounded-[43.2px] bg-[#478bff] p-[26px] text-[#fdf9f0]">
            <p className="text-[16px] font-semibold uppercase tracking-[0.14px] text-[#fdf9f0]/80">Skybound Blue</p>
            <h2 className="mt-4 text-[22px] font-black tracking-[-0.44px]">Live visuals</h2>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#fdf9f0]/80">Track talk time, sentiment, and action items in one immersive dashboard.</p>
          </div>
          <div className="rounded-[43.2px] bg-[#ffc412] p-[26px] text-[#141414]">
            <p className="text-[16px] font-semibold uppercase tracking-[0.14px] text-[#141414]/80">Golden Rod</p>
            <h2 className="mt-4 text-[22px] font-black tracking-[-0.44px]">Fast onboarding</h2>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#141414]/80">Invite guests, share codes, and start calls without friction.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-28">
        <div className="rounded-[64.8px] bg-[#fdf9f0] px-[65.7px] pt-[55.8px] pb-[108px] text-[#141414]">
          <div className="max-w-2xl space-y-6">
            <p className="text-[18px] font-medium uppercase tracking-[0.14px] text-[#141414]/70">
              Frequently asked questions
            </p>
            <h2 className="text-[36px] font-black leading-[0.9] tracking-[-0.72px]">
              Everything you need to know before your next call.
            </h2>
            <p className="max-w-xl text-[18px] leading-[1.4] tracking-[-0.36px] text-[#141414]/80">
              Get instant clarity with a system that keeps each meeting on track, from join codes to speaker summaries and follow-up actions.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-[43.2px] bg-[#141414] p-[26px] text-[#fdf9f0]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[22px] font-black leading-[0.9] tracking-[-0.44px]">
                    How does the room code work?
                  </p>
                  <p className="mt-3 max-w-xl text-[16px] leading-[1.5] text-[#fdf9f0]/80">
                    Each session generates a unique code. Share it with teammates so they can join instantly without extra invites.
                  </p>
                </div>
                <span className="rounded-[1000px] bg-[#c7ff69] px-4 py-2 text-[13px] font-semibold text-[#141414] uppercase tracking-[0.14px]">
                  Secure
                </span>
              </div>
            </motion.article>

            <article className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[43.2px] bg-[#7a78ff] p-[26px] text-[#fdf9f0]">
                <p className="text-[18px] font-semibold tracking-[-0.36px]">Summaries in seconds</p>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#fdf9f0]/80">
                  After each call, receive a concise report of the most important items.
                </p>
              </div>
              <div className="rounded-[43.2px] bg-[#00a652] p-[26px] text-[#fdf9f0]">
                <p className="text-[18px] font-semibold tracking-[-0.36px]">No shadows, just clarity</p>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#fdf9f0]/80">
                  The interface relies on bold color and rounded surfaces instead of soft elevation.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
