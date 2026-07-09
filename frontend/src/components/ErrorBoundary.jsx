import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Catches render-time crashes anywhere in the tree so the app
// degrades to a recovery screen instead of a white page.
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error("Unhandled render error:", error, info);
    }

    handleReload = () => {
        this.setState({ hasError: false });
        window.location.href = "/";
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20">
                        <AlertTriangle className="h-7 w-7 text-[var(--danger)]" />
                    </div>
                    <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                        Something went wrong
                    </h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        An unexpected error occurred. Your meetings and data are safe —
                        reload to get back to work.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--text-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-base)] transition hover:opacity-90"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Back to home
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
