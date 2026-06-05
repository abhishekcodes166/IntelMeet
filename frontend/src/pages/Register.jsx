import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, UserPlus, AlertCircle, Sparkles } from "lucide-react";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const result = await register(fullName, email, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Failed to register.");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040506] px-4 py-16 text-[#ffffff]">
      <div className="pointer-events-none absolute left-0 top-16 h-72 w-72 rounded-full bg-[#111214]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-48 h-64 w-64 rounded-full bg-[#523091]/20 blur-3xl" />
      <div className="pointer-events-none absolute left-20 bottom-24 h-56 w-56 rounded-full bg-[#363739]/20 blur-3xl" />

      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-[6px] bg-[#1b1c1e] px-4 py-2 text-[12px] font-semibold uppercase text-[#ffffff] tracking-[0.04em]">
            <Sparkles className="h-4 w-4" />
            Smart meeting signup
          </div>

          <div className="space-y-6">
            <h1 className="text-[54px] font-semibold leading-[0.9] tracking-[-0.08em] text-[#ffffff] md:text-[72px]">
              Create your AI meeting hub
            </h1>
            <p className="max-w-xl text-[18px] leading-[1.2] tracking-[-0.36px] text-[#ffffff]/80">
              Register for instant access to live transcripts, automated summaries, and encrypted room sessions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[16px] bg-[#111214] p-[26px] text-[#ffffff]">
              <p className="text-[14px] uppercase tracking-[0.14px] text-[#ffffff]/80">
                Ready in seconds
              </p>
              <p className="mt-4 text-[18px] font-semibold tracking-[-0.36px]">
                Use your credentials to join your first room immediately.
              </p>
            </div>
            <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#111214] p-[26px] text-[#ffffff]">
              <p className="inline-flex items-center gap-2 text-[14px] uppercase tracking-[0.14px] text-[#ffffff]/80">
                <span className="h-2 w-2 rounded-full bg-[#59d499]" />
                Team friendly
              </p>
              <p className="mt-4 text-[18px] font-semibold tracking-[-0.36px]">
                Create a secure workspace for every meeting participant.
              </p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[16px] border border-[#ffffff]/10 bg-[#040506]/95 p-[32px] shadow-none"
        >
          <div className="mb-8 space-y-3">
            <p className="text-[13px] uppercase tracking-[0.14px] text-[#e6e6e6] font-semibold">
              Create account
            </p>
            <h2 className="text-[36px] font-black tracking-[-0.04em] text-[#ffffff]">
              Get started with AI meetings
            </h2>
            <p className="text-[14px] leading-[1.4] text-[#ffffff]/70">
              Sign up once and manage every meeting room with powerful live tools.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 flex items-center gap-3 rounded-[8px] border border-[#ff6363]/20 bg-[#ff6363]/10 px-4 py-4 text-[#ff6363]"
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-[14px] font-medium">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.165px] text-[#ffffff]/60 mb-2">
                Full name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#ffffff]/60">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-[8px] border border-[#ffffff]/10 bg-[#040506] px-4 py-[12px] pl-12 text-[14px] font-medium text-[#ffffff] placeholder-[#ffffff]/40 focus:border-[#e6e6e6] focus:outline-none focus:ring-2 focus:ring-[#e6e6e6]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.165px] text-[#ffffff]/60 mb-2">
                Email address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#ffffff]/60">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[8px] border border-[#ffffff]/10 bg-[#040506] px-4 py-[12px] pl-12 text-[14px] font-medium text-[#ffffff] placeholder-[#ffffff]/40 focus:border-[#e6e6e6] focus:outline-none focus:ring-2 focus:ring-[#e6e6e6]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.165px] text-[#ffffff]/60 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#ffffff]/60">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="•••••••• (Min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[8px] border border-[#ffffff]/10 bg-[#040506] px-4 py-[12px] pl-12 text-[14px] font-medium text-[#ffffff] placeholder-[#ffffff]/40 focus:border-[#e6e6e6] focus:outline-none focus:ring-2 focus:ring-[#e6e6e6]/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#e6e6e6] px-[25.848px] py-[8px] text-[14px] font-semibold text-[#040506] transition hover:bg-[#ffffff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#040506]/30 border-t-[#040506]" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span>Sign up</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-[14px] text-[#ffffff]/70">
            Already have an account? {" "}
            <Link to="/login" className="font-semibold text-[#e6e6e6] hover:text-[#ffffff]">
              Sign in instead
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;
