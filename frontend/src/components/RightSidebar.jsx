import { MessageSquare, Captions, PenTool, BarChart3, FileText } from "lucide-react";
import Whiteboard from "./Whiteboard";
import Poll from "./Poll";
import FileSharing from "./FileSharing";
import ChatPanel from "./meeting/ChatPanel";
import TranscriptPanel from "./meeting/TranscriptPanel";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "transcript", label: "Transcript", icon: Captions },
  { id: "whiteboard", label: "Board", icon: PenTool },
  { id: "polls", label: "Polls", icon: BarChart3 },
  { id: "files", label: "Files", icon: FileText },
];

const RightSidebar = ({
  activeTab,
  setActiveTab,
  messages,
  onSendMessage,
  onTyping,
  typingUsers,
  transcripts,
  meetingTitle,
  meetingId,
  socket,
  currentUser,
  unreadChat,
}) => {
  return (
    <div className="w-full sm:w-[360px] bg-[var(--bg-surface)] border-l border-[var(--border)] flex flex-col overflow-hidden h-full relative">
      {/* TAB NAVIGATION */}
      <div className="border-b border-[var(--border)] px-2 pt-2 flex gap-1 shrink-0 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                isActive
                  ? "border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
              title={tab.label}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === "chat" && unreadChat > 0 && !isActive && (
                <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-[var(--accent)] text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadChat > 9 ? "9+" : unreadChat}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" && (
          <ChatPanel
            messages={messages}
            currentUser={currentUser}
            onSend={onSendMessage}
            onTyping={onTyping}
            typingUsers={typingUsers}
          />
        )}

        {activeTab === "transcript" && (
          <TranscriptPanel transcripts={transcripts} meetingTitle={meetingTitle} />
        )}

        {activeTab === "whiteboard" && (
          <div className="p-4 h-full overflow-y-auto">
            <Whiteboard meetingId={meetingId} socket={socket} userName={currentUser?.fullName} />
          </div>
        )}

        {activeTab === "polls" && (
          <div className="p-4 h-full overflow-y-auto">
            <Poll
              socket={socket}
              meetingId={meetingId}
              userName={currentUser?.fullName}
              userId={currentUser?._id}
            />
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-4 h-full overflow-y-auto">
            <FileSharing
              socket={socket}
              meetingId={meetingId}
              userName={currentUser?.fullName}
              userId={currentUser?._id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
