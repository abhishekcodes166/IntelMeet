import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // CREATE MEETING
  // =========================
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
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/meetings/create`,
        { title },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const { meetingCode: code } = response.data.meeting;

        navigate(`/meeting/${code}`);
      } else {
        setError(response.data.message || "Failed to create meeting.");
      }
    } catch (err) {
      console.error("Create meeting error:", err);

      setError(
        err.response?.data?.message || "Server error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // JOIN MEETING
  // =========================
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
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/meetings/join`,
        {
          meetingCode: cleanCode,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        navigate(`/meeting/${cleanCode}`);
      } else {
        setError(response.data.message || "Failed to join meeting.");
      }
    } catch (err) {
      console.error("Join meeting error:", err);

      setError(
        err.response?.data?.message ||
          "Invalid or inactive meeting code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040506] text-[#ffffff]">
      <section className="relative overflow-hidden py-20">
        <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#111214]/15 blur-3xl" />
        <div className="absolute left-0 top-40 h-44 w-44 rounded-full bg-[#523091]/20 blur-3xl" />

        <div className="mx-auto grid max-w-[1440px] gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* LEFT */}
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-[6px] bg-[#1b1c1e] px-4 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-[#ffffff]">
              <Sparkles className="h-4 w-4" />
              AI-powered meeting intelligence
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl font-semibold leading-none tracking-[-0.08em] sm:text-7xl">
                Welcome to Intel Meet
              </h1>

              <p className="max-w-xl text-lg text-[#ffffff]/80">
                Instant summaries, live analytics, and secure room
                codes—designed to keep your team aligned with zero
                friction.
              </p>
            </div>

            {/* CREATE MEETING */}
            <form
              onSubmit={handleCreateMeeting}
              className="grid gap-4"
            >
              <div className="grid gap-3 rounded-[16px] border border-[#ffffff]/10 bg-[#040506]/90 p-4">
                <label
                  className="text-xs uppercase tracking-wide text-[#e6e6e6]"
                  htmlFor="meetingTitle"
                >
                  Meeting title
                </label>

                <input
                  id="meetingTitle"
                  type="text"
                  value={meetingTitle}
                  onChange={(e) =>
                    setMeetingTitle(e.target.value)
                  }
                  placeholder="Enter meeting title"
                  className="w-full rounded-[12px] border border-[#ffffff]/10 bg-[#040506] px-5 py-3 text-sm text-white outline-none focus:border-[#e6e6e6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-[12px] bg-[#e6e6e6] px-6 py-3 text-sm font-semibold text-[#040506] transition hover:bg-[#ffffff]"
              >
                {loading ? "Starting..." : "Start meeting"}

                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </form>

            {/* JOIN MEETING */}
            <motion.form
              onSubmit={handleJoinMeeting}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 rounded-[16px] border border-[#ffffff]/10 bg-[#040506]/90 p-6"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[#e6e6e6]">
                  Join a room instantly
                </p>

                <p className="text-lg text-[#ffffff]/80">
                  Paste your meeting code and hop into the next call.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="text"
                  placeholder="Enter meeting code"
                  value={meetingCode}
                  onChange={(e) =>
                    setMeetingCode(e.target.value)
                  }
                  className="min-w-0 flex-1 rounded-[12px] border border-[#ffffff]/10 bg-[#040506] px-5 py-3 text-sm text-white outline-none focus:border-[#e6e6e6]"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[12px] bg-[#e6e6e6] px-6 py-3 text-sm font-semibold text-[#040506] transition hover:bg-[#ffffff]"
                >
                  {loading ? "Joining..." : "Join with code"}
                </button>
              </div>
            </motion.form>

            {/* ERROR */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-[16px] border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-400"
              >
                <AlertCircle className="h-5 w-5" />

                <span className="text-sm font-medium">
                  {error}
                </span>
              </motion.div>
            )}
          </div>

          {/* RIGHT */}
          <div className="grid gap-6">
            <div className="rounded-[16px] bg-[#111214] p-6 text-white">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase">
                  Live intelligence
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">
                  New
                </span>
              </div>

              <div className="mt-10 space-y-4">
                <div className="rounded-[12px] bg-white/10 p-5">
                  <p className="text-lg font-semibold">
                    Record every moment
                  </p>

                  <p className="mt-2 text-sm text-white/80">
                    Auto transcript capture keeps your team aligned
                    without manual note taking.
                  </p>
                </div>

                <div className="rounded-[12px] bg-white/10 p-5">
                  <p className="text-lg font-semibold">
                    Instant action items
                  </p>

                  <p className="mt-2 text-sm text-white/80">
                    Extract decisions and follow-ups as the call
                    unfolds.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214] p-6 text-white">
                <p className="inline-flex items-center gap-2 text-sm uppercase text-[#9c9c9d]">
                  <span className="h-2 w-2 rounded-full bg-[#59d499]" />
                  Quick stats
                </p>

                <p className="mt-4 text-3xl font-black">
                  98%
                </p>

                <p className="mt-2 text-sm text-white/80">
                  Call retention with instant summaries.
                </p>
              </div>

              <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214] p-6 text-[#ffffff]">
                <p className="inline-flex items-center gap-2 text-sm uppercase text-[#9c9c9d]">
                  <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
                  Safe by design
                </p>

                <p className="mt-4 text-3xl font-black">
                  End-to-end
                </p>

                <p className="mt-2 text-sm text-[#ffffff]/80">
                  Encrypted rooms and user-controlled access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
