import { AlertCircle } from "lucide-react";

/**
 * Shared frame for Login/Register — centered card, brand mark,
 * error banner. Keeps both auth pages visually identical.
 */
export default function AuthShell({ title, subtitle, error, children, footer }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center px-4 py-12">
      {/* BRAND */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white font-bold">
          IM
        </div>
        <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
          IntelMeet
        </span>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger)] animate-fade-in-up">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {children}

        <div className="mt-6 text-center text-sm text-[var(--text-tertiary)]">{footer}</div>
      </div>
    </div>
  );
}

export const AuthInput = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
      {label}
    </label>
    <input
      {...props}
      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/60 focus:bg-white/8 transition"
    />
  </div>
);

export const AuthSubmit = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full h-11 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
  >
    {loading ? (
      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
    ) : (
      children
    )}
  </button>
);
