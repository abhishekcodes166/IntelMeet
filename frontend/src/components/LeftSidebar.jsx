import React from 'react';
import { Users, Phone, Mic, MicOff } from 'lucide-react';

const LeftSidebar = ({ roomId, participants, currentUser, speakingStatus, onInvite }) => {
  const allParticipants = [
    { userId: currentUser?._id, userName: currentUser?.fullName, isSelf: true },
    ...participants.filter(p => p.userId !== currentUser?._id)
  ];

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-[280px] bg-[#111214] border-r border-white/8 flex flex-col overflow-hidden">
      {/* ROOM INFO */}
      <div className="p-4 border-b border-white/8">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Room Information</h3>
        <div className="mt-3 p-3 bg-white/5 rounded-[8px] border border-white/8">
          <p className="text-xs text-white/60">Room ID</p>
          <p className="text-sm font-mono font-bold mt-1">{roomId?.slice(0, 8)}...</p>
        </div>
        <button
          onClick={onInvite}
          className="w-full mt-3 py-2 px-3 rounded-lg bg-[#e6e6e6] text-[#040506] font-semibold text-sm hover:bg-[#ffffff] transition"
        >
          Invite
        </button>
      </div>

      {/* PARTICIPANTS LIST */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-white/60" />
            <h3 className="text-sm font-semibold">Participants ({allParticipants.length})</h3>
          </div>

          <div className="space-y-2">
            {allParticipants.map((participant) => {
              const isSpeaking = speakingStatus[participant.userId];
              return (
                <div
                  key={participant.userId}
                  className={`p-3 rounded-lg border transition ${
                    isSpeaking
                      ? 'bg-[#e6e6e6]/10 border-[#e6e6e6]/30'
                      : 'bg-white/5 border-white/8 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      participant.isSelf ? 'bg-[#1b1c1e]' : 'bg-white/10'
                    } ${isSpeaking ? 'ring-2 ring-[#e6e6e6]' : ''}`}>
                      {getInitials(participant.userName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {participant.userName}
                        {participant.isSelf && ' (You)'}
                      </p>
                      {isSpeaking && (
                        <div className="flex gap-1 mt-1">
                          <div className="w-1 h-1 bg-[#e6e6e6] rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-[#e6e6e6] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-1 bg-[#e6e6e6] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
