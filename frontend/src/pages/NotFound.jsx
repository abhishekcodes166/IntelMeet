import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

function NotFound() {
    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-6">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <Compass className="h-7 w-7 text-[var(--text-secondary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--text-tertiary)]">404</p>
                <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                    Page not found
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    The page you're looking for doesn't exist or has moved.
                </p>
                <Link
                    to="/"
                    className="mt-6 inline-flex items-center rounded-lg bg-[var(--text-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-base)] transition hover:opacity-90"
                >
                    Back to home
                </Link>
            </div>
        </div>
    );
}

export default NotFound;
