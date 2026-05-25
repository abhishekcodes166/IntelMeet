import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, LogIn, AlertCircle, Sparkles } from "lucide-react";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Failed to log in.");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#141414] px-4 py-16 text-[#fdf9f0]">
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#7a78ff]/20 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-48 h-60 w-60 rounded-full bg-[#00a652]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 bottom-20 h-48 w-48 rounded-full bg-[#ffc412]/20 blur-3xl" />

      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-[1000px] bg-[#c7ff69] px-[25.848px] py-[8px] text-[14px] font-semibold text-[#141414] tracking-[0.14px]">
            <Sparkles className="h-4 w-4" />
            Secure meeting access
          </div>

          <div className="space-y-6">
            <h1 className="text-[54px] font-black leading-[0.9] tracking-[-0.04em] text-[#fdf9f0] md:text-[72px]">
              Sign in to your meeting command center
            </h1>
            <p className="max-w-xl text-[18px] leading-[1.2] tracking-[-0.36px] text-[#fdf9f0]/80">
              Your AI-powered workspace for live transcripts, smart summaries, and secure rooms—all wrapped in an energetic dark interface.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[43.2px] bg-[#7a78ff] p-[26px] text-[#fdf9f0]">
              <p className="text-[14px] uppercase tracking-[0.14px] text-[#fdf9f0]/80">
                Fast entry
              </p>
              <p className="mt-4 text-[18px] font-semibold tracking-[-0.36px]">
                Jump into your room instantly after sign in.
              </p>
            </div>
            <div className="rounded-[43.2px] bg-[#00a652] p-[26px] text-[#fdf9f0]">
              <p className="text-[14px] uppercase tracking-[0.14px] text-[#fdf9f0]/80">
                Always secure
              </p>
              <p className="mt-4 text-[18px] font-semibold tracking-[-0.36px]">
                Encrypted sessions and coded room access keep meetings private.
              </p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#141414]/95 p-[32px] shadow-none"
        >
          <div className="mb-8 space-y-3">
            <p className="text-[13px] uppercase tracking-[0.14px] text-[#c7ff69] font-semibold">
              Welcome back
            </p>
            <h2 className="text-[36px] font-black tracking-[-0.04em] text-[#fdf9f0]">
              Sign in to continue
            </h2>
            <p className="text-[14px] leading-[1.4] text-[#fdf9f0]/70">
              Enter your credentials to unlock your meeting intelligence dashboard.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 flex items-center gap-3 rounded-[25.146px] border border-[#ff6d38]/20 bg-[#ff6d38]/10 px-4 py-4 text-[#ff6d38]"
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-[14px] font-medium">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.165px] text-[#fdf9f0]/60 mb-2">
                Email address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#fdf9f0]/60">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414] px-4 py-[12px] pl-12 text-[14px] font-medium text-[#fdf9f0] placeholder-[#fdf9f0]/40 focus:border-[#c7ff69] focus:outline-none focus:ring-2 focus:ring-[#c7ff69]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.165px] text-[#fdf9f0]/60 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#fdf9f0]/60">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414] px-4 py-[12px] pl-12 text-[14px] font-medium text-[#fdf9f0] placeholder-[#fdf9f0]/40 focus:border-[#c7ff69] focus:outline-none focus:ring-2 focus:ring-[#c7ff69]/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-[25.146px] bg-[#c7ff69] px-[25.848px] py-[8px] text-[14px] font-semibold text-[#141414] transition hover:bg-[#b9f25f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#141414]/30 border-t-[#141414]" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-[14px] text-[#fdf9f0]/70">
            Don't have an account? {" "}
            <Link to="/register" className="font-semibold text-[#c7ff69] hover:text-[#b9f25f]">
              Create an account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
