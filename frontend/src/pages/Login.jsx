import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell, { AuthInput, AuthSubmit } from "../components/AuthShell";

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

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Failed to sign in.");
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your meeting workspace"
      error={error}
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthInput
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthSubmit loading={loading}>Sign in</AuthSubmit>
      </form>
    </AuthShell>
  );
}

export default Login;
