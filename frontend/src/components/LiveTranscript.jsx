import React from 'react';
import { Send, MessageCircle } from 'lucide-react';

const LiveTranscript = ({ transcripts, transcriptBottomRef }) => {
  if (transcripts.length === 0) {
    return (
      <div className="px-6 pb-6 max-h-[240px] bg-[#111827] rounded-2xl border border-white/8 flex flex-col items-center justify-center">
        <MessageCircle className="w-8 h-8 text-white/20 mb-2" />
        <p className="text-sm text-white/40">No transcripts yet</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 max-h-[240px] overflow-y-auto bg-[#111827] rounded-2xl border border-white/8">
      <div className="space-y-3">
        {transcripts.map((item, idx) => (
          <div key={idx} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/8 hover:border-white/12 transition">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#818CF8] flex items-center justify-center text-xs font-bold">
              {item.userName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-semibold">{item.userName}</p>
                <p className="text-xs text-white/40">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-sm text-white/80 mt-1 break-words">{item.text}</p>
            </div>
          </div>
        ))}
        <div ref={transcriptBottomRef} />
      </div>
    </div>
  );
};

export default LiveTranscript;
