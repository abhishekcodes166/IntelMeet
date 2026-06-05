import React from 'react';
import { Volume2, Mic, MicOff } from 'lucide-react';

const MeetingStage = ({ participants, currentUser, remoteStreams, speakingStatus, isMuted }) => {
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

  const activeSpeaker = allParticipants.find(p => speakingStatus[p.userId]);

  // Check if only user is in the meeting (no remote participants)
  const isAlone = participants.length === 0;

  return (
    <div className="flex-1 flex flex-col p-6 gap-4 h-full">
      {/* PARTICIPANT COUNT HEADER */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-bold">Meeting Stage</h2>
        <span className="text-sm text-white/60 bg-white/5 px-3 py-1 rounded-lg">
          {allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* MEETING STAGE CARD */}
      <div className="flex-1 min-h-0 bg-[#111214] rounded-[12px] border border-white/8 p-8 shadow-lg flex flex-col items-center justify-center">
        {isAlone ? (
          // EMPTY STATE
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 rounded-[12px] bg-[#1b1c1e]/20 border border-[#1b1c1e]/40 flex items-center justify-center">
                <span className="text-5xl font-bold text-[#1b1c1e]">
                  {getInitials(currentUser?.fullName)}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Waiting for others to join</h2>
            <p className="text-white/40 mb-6">Invite participants to get started</p>
            <div className="flex justify-center gap-3">
              <div className="w-2 h-2 bg-[#e6e6e6] rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-[#e6e6e6] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#e6e6e6] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        ) : (
          // ACTIVE SPEAKERS GRID
          <div className="w-full">
            {activeSpeaker && (
              <div className="mb-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-[12px] bg-[#e6e6e6]/20 border-2 border-[#e6e6e6] flex items-center justify-center animate-pulse">
                      <span className="text-3xl font-bold">{getInitials(activeSpeaker.userName)}</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#59d499] rounded-full border-2 border-[#111214]"></div>
                  </div>
                </div>
                <h3 className="text-lg font-bold">{activeSpeaker.userName}</h3>
                <p className="text-xs text-white/40 mt-1">Speaking now</p>
              </div>
            )}

            {/* PARTICIPANT AVATARS */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {allParticipants.map((participant) => {
                const isSpeaking = speakingStatus[participant.userId];
                return (
                  <div
                    key={participant.userId}
                    className={`flex flex-col items-center p-4 rounded-[8px] border transition ${
                      isSpeaking
                        ? 'bg-[#e6e6e6]/10 border-[#e6e6e6]/40'
                        : 'bg-white/5 border-white/8'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-[8px] flex items-center justify-center font-bold text-xl mb-2 ${
                      participant.isSelf ? 'bg-[#1b1c1e]' : 'bg-white/10'
                    } ${isSpeaking ? 'ring-2 ring-[#e6e6e6]' : ''}`}>
                      {getInitials(participant.userName)}
                    </div>
                    <p className="text-xs font-semibold text-center truncate">{participant.userName}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {isSpeaking ? (
                        <>
                          <Volume2 className="w-3 h-3 text-[#e6e6e6]" />
                          <span className="text-xs text-[#e6e6e6] font-medium">Talking</span>
                        </>
                      ) : (
                        <span className="text-xs text-white/40">Listening</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingStage;
