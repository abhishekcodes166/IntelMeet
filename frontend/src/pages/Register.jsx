import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell, { AuthInput, AuthSubmit } from "../components/AuthShell";

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

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = await register(fullName.trim(), email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Failed to create your account.");
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Meetings with live transcripts and AI summaries"
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthSubmit loading={loading}>Create account</AuthSubmit>
      </form>
    </AuthShell>
  );
}

export default Register;
