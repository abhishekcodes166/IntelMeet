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
        "/meetings/create",
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
        "/meetings/join",
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
    <div className="min-h-screen bg-[#141414] text-[#fdf9f0]">
      <section className="relative overflow-hidden py-20">
        <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#7a78ff]/15 blur-3xl" />
        <div className="absolute left-0 top-40 h-44 w-44 rounded-full bg-[#00a652]/15 blur-3xl" />

        <div className="mx-auto grid max-w-[1440px] gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* LEFT */}
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#c7ff69] px-4 py-2 text-sm font-semibold text-[#141414]">
              <Sparkles className="h-4 w-4" />
              AI-powered meeting intelligence
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl font-black leading-none tracking-tight sm:text-7xl">
                Welcome to Intel Meet
              </h1>

              <p className="max-w-xl text-lg text-[#fdf9f0]/80">
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
              <div className="grid gap-3 rounded-3xl border border-[#fdf9f0]/10 bg-[#141414]/90 p-4">
                <label
                  className="text-xs uppercase tracking-wide text-[#c7ff69]"
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
                  className="w-full rounded-2xl border border-[#fdf9f0]/10 bg-[#141414] px-5 py-3 text-sm text-white outline-none focus:border-[#c7ff69]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-[#c7ff69] px-6 py-3 text-sm font-semibold text-[#141414] transition hover:bg-[#b9f25f]"
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
              className="grid gap-4 rounded-3xl border border-[#fdf9f0]/10 bg-[#141414]/90 p-6"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[#c7ff69]">
                  Join a room instantly
                </p>

                <p className="text-lg text-[#fdf9f0]/80">
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
                  className="min-w-0 flex-1 rounded-2xl border border-[#fdf9f0]/10 bg-[#141414] px-5 py-3 text-sm text-white outline-none focus:border-[#c7ff69]"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-[#c7ff69] px-6 py-3 text-sm font-semibold text-[#141414] transition hover:bg-[#b9f25f]"
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
                className="flex items-center gap-3 rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-400"
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
            <div className="rounded-3xl bg-[#7a78ff] p-6 text-white">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase">
                  Live intelligence
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">
                  New
                </span>
              </div>

              <div className="mt-10 space-y-4">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-lg font-semibold">
                    Record every moment
                  </p>

                  <p className="mt-2 text-sm text-white/80">
                    Auto transcript capture keeps your team aligned
                    without manual note taking.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-5">
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
              <div className="rounded-3xl bg-[#00a652] p-6 text-white">
                <p className="text-sm uppercase">
                  Quick stats
                </p>

                <p className="mt-4 text-3xl font-black">
                  98%
                </p>

                <p className="mt-2 text-sm text-white/80">
                  Call retention with instant summaries.
                </p>
              </div>

              <div className="rounded-3xl bg-[#ccccff] p-6 text-[#141414]">
                <p className="text-sm uppercase">
                  Safe by design
                </p>

                <p className="mt-4 text-3xl font-black">
                  End-to-end
                </p>

                <p className="mt-2 text-sm text-[#141414]/80">
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