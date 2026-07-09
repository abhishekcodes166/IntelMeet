import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, History, LogOut } from "lucide-react";

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/history", label: "History", icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-base)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-16">
          {/* BRAND */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white font-bold text-sm">
              IM
            </div>
            <span className="text-sm font-semibold tracking-tight">IntelMeet</span>
          </Link>

          {/* NAV */}
          <nav className="flex items-center gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white/8 text-[var(--text-primary)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-white/4"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* USER */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                  {initials}
                </div>
                <span className="hidden md:block text-sm text-[var(--text-secondary)]">
                  {user.fullName.split(" ")[0]}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

export default Layout;
