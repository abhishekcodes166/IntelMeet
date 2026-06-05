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
    <div className="min-h-screen bg-[#040506] text-[#ffffff]">
      <header className="sticky top-0 z-40 border-b border-[#ffffff]/10 bg-[#040506]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#e6e6e6] text-[#040506] font-black text-lg">
              A
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-[0.165px] font-semibold text-[#ffffff]">
                AI MEET
              </p>
              <p className="text-[14px] tracking-[0.14px] font-medium text-[#9c9c9d]">
                Obsidian Command
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
                  className={`rounded-[8px] px-4 py-2 text-[14px] font-medium transition ${
                    isActive
                      ? "bg-[#e6e6e6] text-[#040506] border border-[#ffffff]/20"
                      : "bg-[#111214] text-[#9c9c9d] border border-[#ffffff]/10 hover:text-[#ffffff]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#040506]" : "text-[#9c9c9d]"}`} />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <div className="rounded-[16px] border border-[#ffffff]/10 bg-[#ffffff]/10 px-4 py-2 text-sm font-medium text-[#ffffff]">
                {user.fullName.split(" ")[0]}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="rounded-[8px] border border-[#040506] bg-[#ffffff] px-[25.848px] py-2 text-[14px] font-semibold text-[#040506] transition hover:bg-[#e9e4d5]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="bg-[#040506]">
        {children}
      </main>
    </div>
  );
}

export default Layout;
