import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, History, LogOut, Sparkles } from "lucide-react";

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", label: "Overview", icon: Home },
    { path: "/history", label: "Meeting History", icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#fdf9f0]">
      <header className="sticky top-0 z-40 border-b border-[#fdf9f0]/10 bg-[#141414]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20.7px] bg-[#c7ff69] text-[#141414] font-black text-lg">
              A
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-[0.165px] font-semibold text-[#141414]">
                AI MEET
              </p>
              <p className="text-[14px] tracking-[0.14px] font-medium text-[#141414]">
                Neon Playroom
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`rounded-[20.7px] px-4 py-2 text-[14px] font-medium transition ${
                    isActive
                      ? "bg-[#fdf9f0] text-[#141414] border border-[#141414]"
                      : "bg-[#fdf9f0]/90 text-[#141414]/90 hover:bg-[#fdf9f0] hover:text-[#141414]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#141414]" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <div className="rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#fdf9f0]/10 px-4 py-2 text-sm font-medium text-[#fdf9f0]">
                {user.fullName.split(" ")[0]}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="rounded-[25.146px] border border-[#141414] bg-[#fdf9f0] px-[25.848px] py-2 text-[14px] font-semibold text-[#141414] transition hover:bg-[#e9e4d5]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="bg-[#141414]">
        {children}
      </main>
    </div>
  );
}

export default Layout;
