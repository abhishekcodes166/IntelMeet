import React, { useState } from 'react';
import { Send, MessageSquare, PenTool, BarChart3, FileText, Sparkles } from 'lucide-react';
import Whiteboard from './Whiteboard';
import Poll from './Poll';
import FileSharing from './FileSharing';

const RightSidebar = ({
  activeTab,
  setActiveTab,
  messages,
  chatInput,
  setChatInput,
  onSendMessage,
  chatBottomRef,
  meetingId,
  socket,
  currentUser,
}) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
    { id: 'polls', label: 'Polls', icon: BarChart3 },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'notes', label: 'AI Notes', icon: Sparkles },
  ];

  return (
    <div className="w-[340px] bg-[#111214] border-l border-white/8 flex flex-col overflow-hidden h-full">
      {/* TAB NAVIGATION */}
      <div className="border-b border-white/8 p-3 flex gap-2 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#e6e6e6] text-[#040506] font-semibold'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
              title={tab.label}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/40">
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="rounded-lg bg-white/5 border border-white/8 p-3 hover:border-white/12 transition">
                    <p className="text-xs font-semibold text-[#e6e6e6]">{msg.userName}</p>
                    <p className="text-sm mt-2 text-white/80 break-words">{msg.message}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* CHAT INPUT */}
            <div className="p-4 border-t border-white/8">
              <form onSubmit={onSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-[#e6e6e6]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-[#e6e6e6] text-[#040506] hover:bg-[#ffffff] transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* WHITEBOARD TAB */}
        {activeTab === 'whiteboard' && (
          <div className="p-4 h-full">
            <Whiteboard meetingId={meetingId} socket={socket} userName={currentUser?.fullName} />
          </div>
        )}

        {/* POLLS TAB */}
        {activeTab === 'polls' && (
          <div className="p-4 h-full">
            <Poll socket={socket} meetingId={meetingId} userName={currentUser?.fullName} userId={currentUser?._id} />
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
          <div className="p-4 h-full">
            <FileSharing socket={socket} meetingId={meetingId} userName={currentUser?.fullName} userId={currentUser?._id} />
          </div>
        )}

        {/* AI NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-[#e6e6e6] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-white/40">AI Notes coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
