import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Peer from "peerjs";
import axios from "axios";
import {
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Users,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";

import socket from "../socket";

function useSpeechRecognition({ onTranscript, enabled }) {
  const recognitionRef = useRef(null);
  const isRunningRef = useRef(false);
  const restartTimerRef = useRef(null);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }
    if (isRunningRef.current) return;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRunningRef.current = true;
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalText.trim()) {
        onTranscript(finalText.trim(), true);
      } else if (interimText.trim()) {
        onTranscript(interimText.trim(), false);
      }
    };

    recognition.onend = () => {
      if (isRunningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (isRunningRef.current) {
            try {
              recognition.start();
            } catch (_) {}
          }
        }, 300);
      }
    };

    recognition.onerror = () => {
      if (isRunningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (isRunningRef.current) {
            try {
              recognition.start();
            } catch (_) {}
          }
        }, 1000);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("[SpeechRecognition] Could not start:", err);
    }
  }, [onTranscript]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [enabled, start, stop]);

  return { stop };
}

function Meeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [liveTranscripts, setLiveTranscripts] = useState([]);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState({});

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallsRef = useRef({});
  const chatBottomRef = useRef(null);
  const transcriptBottomRef = useRef(null);

  const handleTranscript = useCallback(
    (text, isFinal) => {
      if (!user || isMuted) return;
      setLiveTranscripts((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.userName === user.fullName && !last.isFinal) {
          return [
            ...prev.slice(0, -1),
            { userName: user.fullName, text, isFinal, timestamp: new Date() },
          ];
        }
        return [...prev, { userName: user.fullName, text, isFinal, timestamp: new Date() }];
      });
      socket.emit("send-transcript", {
        roomId,
        userName: user.fullName,
        userId: user._id,
        text,
        isFinal,
      });
    },
    [user, isMuted, roomId]
  );

  useSpeechRecognition({ onTranscript: handleTranscript, enabled: transcriptionEnabled && !isMuted });

  useEffect(() => {
    if (!user) return;

    let peerId = null;
    const peer = new Peer(undefined, { debug: 2 });
    peerRef.current = peer;

    navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      .then((stream) => {
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Microphone permission denied. Please allow microphone access.");
      });

    peer.on("open", (id) => {
      peerId = id;
      socket.emit("join-room", {
        roomId,
        peerId: id,
        userName: user.fullName,
        userId: user._id,
      });
    });

    peer.on("call", (call) => {
      if (activeCallsRef.current[call.peer]) return;
      activeCallsRef.current[call.peer] = call;
      call.answer(localStreamRef.current);
      call.on("stream", (remoteStream) => {
        setRemoteStreams((prev) => {
          if (prev[call.peer]) return prev;
          return { ...prev, [call.peer]: remoteStream };
        });
      });
      call.on("close", () => cleanupPeer(call.peer));
      call.on("error", () => cleanupPeer(call.peer));
    });

    socket.on("user-connected", ({ peerId }) => {
      if (activeCallsRef.current[peerId]) return;
      setTimeout(() => {
        if (!localStreamRef.current) return;
        const call = peer.call(peerId, localStreamRef.current);
        activeCallsRef.current[peerId] = call;
        call.on("stream", (remoteStream) => {
          setRemoteStreams((prev) => {
            if (prev[peerId]) return prev;
            return { ...prev, [peerId]: remoteStream };
          });
        });
        call.on("close", () => cleanupPeer(peerId));
        call.on("error", () => cleanupPeer(peerId));
      }, 1000);
    });

    socket.on("room-users", (users) => setParticipants(users));
    socket.on("user-disconnected", ({ peerId }) => cleanupPeer(peerId));
    socket.on("receive-message", (message) => setMessages((prev) => [...prev, message]));
    socket.on("receive-transcript", ({ userName, text, isFinal, timestamp }) => {
      if (userName === user.fullName) return;
      setLiveTranscripts((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.userName === userName && !last.isFinal) {
          return [...prev.slice(0, -1), { userName, text, isFinal, timestamp }];
        }
        return [...prev, { userName, text, isFinal, timestamp }];
      });
    });
    socket.on("user-speaking-status", ({ socketId, isSpeaking }) => {
      setSpeakingUsers((prev) => ({ ...prev, [socketId]: isSpeaking }));
    });
    socket.on("meeting-ended-signal", () => navigate("/history"));

    return () => {
      socket.off("user-connected");
      socket.off("room-users");
      socket.off("user-disconnected");
      socket.off("receive-message");
      socket.off("receive-transcript");
      socket.off("user-speaking-status");
      socket.off("meeting-ended-signal");
      Object.values(activeCallsRef.current).forEach((call) => call.close());
      activeCallsRef.current = {};
      if (peerRef.current) peerRef.current.destroy();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, user, navigate]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveTranscripts]);

  const cleanupPeer = (peerId) => {
    if (activeCallsRef.current[peerId]) {
      activeCallsRef.current[peerId].close();
      delete activeCallsRef.current[peerId];
    }
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  const toggleMic = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }
    socket.emit("toggle-mute", { roomId, isMuted: nextState });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit("send-message", {
      roomId,
      userName: user.fullName,
      userId: user._id,
      message: chatInput,
    });
    setChatInput("");
  };

  const handleEndMeeting = async () => {
    if (isEndingMeeting) return;
    setIsEndingMeeting(true);
    try {
      socket.emit("end-meeting", { roomId });
      await axios.post(
  `${import.meta.env.VITE_BACKEND_URL}/meetings/generate-summary`,
  { roomId },
  { withCredentials: true }
);
    } catch (err) {
      console.error("End meeting error:", err.response?.data || err.message);
    } finally {
      navigate("/history");
    }
  };

  const handleLeaveMeeting = () => navigate("/");

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#fdf9f0]">
      <header className="border-b border-[#fdf9f0]/10 bg-[#141414]/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-[1000px] bg-[#c7ff69] px-4 py-2 text-[14px] font-semibold text-[#141414]">
              <Sparkles className="h-4 w-4" />
              Live meeting room
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-black tracking-[-0.04em]">Secure Audio Room</h1>
              <span className="rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#fdf9f0]/5 px-4 py-2 text-sm text-[#fdf9f0]/80">Room ID: {roomId}</span>
              <span className="rounded-[25.146px] bg-[#141414] px-4 py-2 text-sm text-[#fdf9f0]/80">
                {participants.length} active
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copyRoomCode}
              className="rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#fdf9f0]/10 px-4 py-2 text-sm font-semibold text-[#fdf9f0] transition hover:bg-[#fdf9f0]/20"
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
            <span className="text-sm text-[#fdf9f0]/70">{participants.length} participants</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-6 py-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-6">
          <div className="rounded-[43.2px] bg-[#141414]/95 border border-[#fdf9f0]/10 p-[26px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[13px] uppercase tracking-[0.14px] text-[#c7ff69] font-semibold">Room status</p>
                <h2 className="mt-3 text-[28px] font-black tracking-[-0.44px] text-[#fdf9f0]">Live session</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-[1000px] bg-[#141414] px-4 py-2 text-sm text-[#c7ff69] border border-[#c7ff69]/10">
                <span className="h-2.5 w-2.5 rounded-full bg-[#c7ff69] animate-pulse" />
                Transcription active
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.7] text-[#fdf9f0]/80">
              This space is designed for small team syncs with live chat, speaker analytics, and on-the-fly transcription.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[43.2px] bg-[#7a78ff] p-[26px] text-[#fdf9f0]">
              <p className="text-[13px] uppercase tracking-[0.14px] text-[#fdf9f0]/80 font-semibold">Host controls</p>
              <p className="mt-4 text-[22px] font-black tracking-[-0.44px]">{isMuted ? "Muted" : "Microphone on"}</p>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#fdf9f0]/80">
                {isMuted ? "Your mic is silenced across the room." : "Everyone can hear you while transcription runs live."}
              </p>
            </div>
            <div className="rounded-[43.2px] bg-[#00a652] p-[26px] text-[#fdf9f0]">
              <p className="text-[13px] uppercase tracking-[0.14px] text-[#fdf9f0]/80 font-semibold">Participants</p>
              <p className="mt-4 text-[22px] font-black tracking-[-0.44px]">{participants.length + 1}</p>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#fdf9f0]/80">Active participants joined in the room.</p>
            </div>
          </div>

          <div className="rounded-[43.2px] bg-[#141414]/95 border border-[#fdf9f0]/10 p-[26px]">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-[13px] uppercase tracking-[0.14px] text-[#7a78ff]/80 font-semibold">Participants</p>
                <h3 className="mt-2 text-[22px] font-black tracking-[-0.44px] text-[#fdf9f0]">Live grid</h3>
              </div>
              <span className="rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#fdf9f0]/5 px-3 py-1 text-[12px] text-[#fdf9f0]/70">
                {Object.keys(remoteStreams).length + 1} tiles
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ParticipantTile name={user?.fullName} isSelf isMuted={isMuted} />
              {participants
                .filter((p) => p.socketId !== socket.id)
                .map((p) => (
                  <ParticipantTile
                    key={p.socketId}
                    name={p.userName}
                    isMuted={p.isMuted}
                    isSpeaking={speakingUsers[p.socketId]}
                  />
                ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[43.2px] bg-[#141414]/95 border border-[#fdf9f0]/10 p-[22px]">
            <div className="grid grid-cols-3 gap-2 rounded-[43.2px] bg-[#141414]/95 p-1">
              {[
                { id: "chat", label: "Chat" },
                { id: "transcript", label: "Transcript" },
                { id: "participants", label: "People" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSidebarTab(tab.id)}
                  className={`rounded-[43.2px] py-3 text-[13px] font-semibold transition ${
                    activeSidebarTab === tab.id
                      ? "bg-[#fdf9f0] text-[#141414]"
                      : "text-[#fdf9f0]/70 hover:bg-[#fdf9f0]/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeSidebarTab === "chat" && (
              <div className="mt-5 flex h-[460px] flex-col rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#141414]/90 overflow-hidden">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="mt-8 text-center text-sm text-[#fdf9f0]/60">No messages yet. Say hi!</div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-[#fdf9f0]/60">
                          <span>{msg.userName}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className={`rounded-[25.146px] p-3 text-sm ${msg.userName === user?.fullName ? "bg-[#c7ff69]/15 text-[#fdf9f0]" : "bg-[#fdf9f0]/5 text-[#141414]"}`}>
                          {msg.message}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-3 border-t border-[#fdf9f0]/10 bg-[#141414]/95 p-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414] px-4 py-3 text-sm text-[#fdf9f0] outline-none focus:border-[#c7ff69] focus:ring-2 focus:ring-[#c7ff69]/15"
                  />
                  <button type="submit" className="inline-flex h-12 w-12 items-center justify-center rounded-[25.146px] bg-[#c7ff69] text-[#141414] transition hover:bg-[#b9f25f]">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {activeSidebarTab === "transcript" && (
              <div className="mt-5 rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#141414]/90 p-4">
                <div className="mb-4 flex items-center justify-between text-sm text-[#fdf9f0]/70">
                  <span>{transcriptionEnabled ? "Live transcription active" : "Transcription paused"}</span>
                  <button
                    onClick={() => setTranscriptionEnabled((v) => !v)}
                    className={`rounded-[25.146px] px-3 py-1 text-xs font-semibold transition ${transcriptionEnabled ? "bg-[#00a652]/15 text-[#00a652]" : "bg-[#fdf9f0]/10 text-[#fdf9f0]"}`}
                  >
                    {transcriptionEnabled ? "Pause" : "Resume"}
                  </button>
                </div>
                <div className="max-h-[420px] space-y-4 overflow-y-auto">
                  {liveTranscripts.length === 0 ? (
                    <div className="text-center text-sm text-[#fdf9f0]/60">Transcripts appear here as the discussion flows.</div>
                  ) : (
                    liveTranscripts.map((t, i) => (
                      <div key={i} className={`rounded-[25.146px] p-4 ${t.isFinal ? "bg-[#fdf9f0]/10 text-[#fdf9f0]" : "bg-[#fdf9f0]/5 text-[#fdf9f0]/80 italic"}`}>
                        <div className="flex items-center justify-between text-[13px] font-semibold text-[#c7ff69]">
                          <span>{t.userName}</span>
                          <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                        </div>
                        <p className="mt-2 leading-[1.7]">{t.text}</p>
                      </div>
                    ))
                  )}
                  <div ref={transcriptBottomRef} />
                </div>
              </div>
            )}

            {activeSidebarTab === "participants" && (
              <div className="mt-5 space-y-4 rounded-[43.2px] border border-[#fdf9f0]/10 bg-[#141414]/90 p-4">
                <div className="rounded-[43.2px] bg-[#fdf9f0]/5 p-4">
                  <div className="text-[13px] uppercase tracking-[0.14px] text-[#7a78ff]/80 font-semibold">You</div>
                  <div className="mt-3 flex items-center gap-3 rounded-[25.146px] bg-[#141414]/95 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[20.7px] bg-[#7a78ff] text-sm font-black text-[#fdf9f0]">
                      {user?.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#fdf9f0]">{user?.fullName}</p>
                      <p className="text-[13px] text-[#fdf9f0]/60">{isMuted ? "Muted" : "Speaking"}</p>
                    </div>
                    {isMuted && <MicOff className="h-4 w-4 text-[#ff6d38]" />}
                  </div>
                </div>
                <div className="space-y-3">
                  {participants
                    .filter((p) => p.socketId !== socket.id)
                    .map((p) => (
                      <div key={p.socketId} className="flex items-center gap-3 rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414]/95 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[20.7px] bg-[#fdf9f0]/10 text-sm font-black text-[#fdf9f0]">
                          {p.userName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#fdf9f0] truncate">{p.userName}</p>
                          <p className="text-[13px] text-[#fdf9f0]/60">{p.isMuted ? "Muted" : "Joined"}</p>
                        </div>
                        {p.isMuted && <MicOff className="h-4 w-4 text-[#ff6d38]" />}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="border-t border-[#fdf9f0]/10 bg-[#141414]/95 px-6 py-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-4">
          <button
            onClick={toggleMic}
            className={`inline-flex items-center justify-center rounded-[25.146px] px-5 py-4 text-sm font-semibold transition ${isMuted ? "bg-[#ff6d38] text-[#141414] hover:bg-[#ff6d38]/90" : "bg-[#c7ff69] text-[#141414] hover:bg-[#b9f25f]"}`}
          >
            {isMuted ? (
              <span className="flex items-center gap-2"><MicOff className="h-5 w-5" /> Unmute</span>
            ) : (
              <span className="flex items-center gap-2"><Mic className="h-5 w-5" /> Mute</span>
            )}
          </button>
          <button
            onClick={handleLeaveMeeting}
            className="inline-flex items-center justify-center rounded-[25.146px] border border-[#fdf9f0]/10 bg-[#141414] px-5 py-4 text-sm font-semibold text-[#fdf9f0] transition hover:bg-[#fdf9f0]/5"
          >
            <PhoneOff className="h-5 w-5" /> Leave room
          </button>
          <button
            onClick={handleEndMeeting}
            disabled={isEndingMeeting}
            className="inline-flex items-center justify-center rounded-[25.146px] bg-[#ff6d38] px-6 py-4 text-sm font-semibold text-[#141414] transition hover:bg-[#ff6d38]/90 disabled:opacity-60"
          >
            {isEndingMeeting ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Ending...</span>
            ) : (
              "End for All"
            )}
          </button>
        </div>
      </footer>

      <div className="hidden" aria-hidden="true">
        {Object.keys(remoteStreams).map((peerId) => (
          <AudioPlayer key={peerId} stream={remoteStreams[peerId]} />
        ))}
      </div>

      {error && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-[43.2px] border border-[#ff6d38]/20 bg-[#ff6d38]/10 px-5 py-3 text-sm text-[#ff6d38]">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#ff6d38]" />
          {error}
        </div>
      )}
    </div>
  );
}

function ParticipantTile({ name, isSelf, isMuted, isSpeaking }) {
  return (
    <div className="rounded-[43.2px] bg-[#141414]/95 border border-[#fdf9f0]/10 p-5 text-center">
      <div className={`relative mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-[43.2px] ${isSelf ? "bg-[#7a78ff]" : "bg-[#181818]"}`}>
        <span className="text-4xl font-black text-[#fdf9f0]">{name?.charAt(0)?.toUpperCase() ?? "?"}</span>
        {isSpeaking && <span className="absolute -right-2 -bottom-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00a652] text-[10px] font-black text-[#141414]">Live</span>}
        {isMuted && (
          <div className="absolute bottom-2 right-2 rounded-full bg-[#ff6d38] p-1">
            <MicOff className="h-3 w-3 text-[#141414]" />
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-[#fdf9f0] truncate">{name}</p>
      {isSelf && <p className="mt-1 text-[11px] uppercase tracking-[0.14px] text-[#fdf9f0]/60">you</p>}
    </div>
  );
}

function AudioPlayer({ stream }) {
  const audioRef = useRef(null);
  useEffect(() => {
    if (!audioRef.current || !stream) return;
    const audio = audioRef.current;
    audio.srcObject = stream;
    audio.play().catch((err) => console.error("Audio play failed:", err));
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline />;
}

export default Meeting;
