import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";

import api from "../lib/api";
import socket from "../socket";
import useAudioCall from "../hooks/useAudioCall";
import useSpeechRecognition from "../hooks/useSpeechRecognition";

import TopBar from "../components/TopBar";
import LeftSidebar from "../components/LeftSidebar";
import MeetingStage from "../components/MeetingStage";
import RightSidebar from "../components/RightSidebar";
import ControlBar from "../components/ControlBar";
import InviteModal from "../components/meeting/InviteModal";

const makeClientId = () =>
  (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const MESSAGE_ACK_TIMEOUT_MS = 8000;
const TYPING_IDLE_MS = 2500;
const CAPTION_HIDE_MS = 5000;

function MeetingLayout() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------
  const [participants, setParticipants] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [hostId, setHostId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [captions, setCaptions] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [speakingStatus, setSpeakingStatus] = useState({});
  const [reactions, setReactions] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState("chat");
  const [unreadChat, setUnreadChat] = useState(0);
  const [copied, setCopied] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const peerIdRef = useRef(null);
  const typingTimersRef = useRef({});
  const typingEmitRef = useRef({ isTyping: false, timer: null });
  const captionTimerRef = useRef(null);
  const activeTabRef = useRef(activeRightTab);
  useEffect(() => {
    activeTabRef.current = activeRightTab;
  }, [activeRightTab]);

  const pushToast = useCallback((text, tone = "info") => {
    const id = makeClientId();
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ---------------------------------------------------------
  // AUDIO CALL (PeerJS lifecycle lives in the hook)
  // ---------------------------------------------------------
  const joinRoom = useCallback(() => {
    if (!peerIdRef.current || !socket.connected || !user) return;
    socket.emit(
      "join-room",
      { roomId, peerId: peerIdRef.current, userName: user.fullName },
      (ack) => {
        if (ack?.success && ack.meetingStartTime) {
          setMeetingStartTime(new Date(ack.meetingStartTime));
        } else if (ack && !ack.success) {
          pushToast(ack.message || "Could not join the room", "error");
        }
      }
    );
  }, [roomId, user, pushToast]);

  const handleSelfSpeaking = useCallback(
    (isSpeaking) => {
      socket.emit("speaking", { roomId, isSpeaking });
      setSpeakingStatus((prev) => ({ ...prev, [user?._id]: isSpeaking }));
    },
    [roomId, user]
  );

  const {
    remoteStreams,
    isMuted,
    toggleMute,
    micError,
    micReady,
    retryMic,
    callPeer,
    closeCallToPeer,
  } = useAudioCall({
    enabled: !!user,
    onPeerOpen: (peerId) => {
      peerIdRef.current = peerId;
      joinRoom();
    },
    onSpeakingChange: handleSelfSpeaking,
  });

  // ---------------------------------------------------------
  // TRANSCRIPTION
  // ---------------------------------------------------------
  const showCaption = useCallback((userName, text) => {
    setCaptions({ userName, text });
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setCaptions(null), CAPTION_HIDE_MS);
  }, []);

  const handleTranscript = useCallback(
    (text) => {
      if (!user) return;
      const entry = {
        id: makeClientId(),
        userName: user.fullName,
        userId: user._id,
        text,
        timestamp: new Date(),
      };
      socket.emit("send-transcript", {
        roomId,
        text,
        isFinal: true,
        clientId: entry.id,
      });
      setTranscripts((prev) => [...prev, entry]);
      showCaption(user.fullName, text);
    },
    [roomId, user, showCaption]
  );

  useSpeechRecognition({
    onTranscript: handleTranscript,
    enabled: transcriptionEnabled && !isMuted && micReady,
  });

  // ---------------------------------------------------------
  // SOCKET WIRING
  // ---------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const onConnect = () => {
      setSocketConnected(true);
      joinRoom(); // re-join after reconnects so state stays in sync
    };
    const onDisconnect = () => setSocketConnected(false);

    const onRoomUsers = (users) => {
      setParticipants(users);
    };

    const onUserConnected = ({ peerId, userName }) => {
      if (peerId) callPeer(peerId);
      if (userName) pushToast(`${userName} joined the meeting`);
    };

    const onUserDisconnected = ({ peerId, userName, userId }) => {
      if (peerId) closeCallToPeer(peerId);
      if (userName) pushToast(`${userName} left the meeting`);
      if (userId) {
        setSpeakingStatus((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    const onRoomHistory = ({ messages: history, transcripts: transcriptHistory, meetingStartTime: start }) => {
      if (start) setMeetingStartTime(new Date(start));
      setMessages((prev) => {
        // Preserve unacked optimistic messages across a reconnect
        const pending = prev.filter((m) => m.status === "sending" || m.status === "failed");
        const seen = new Set((history || []).map((m) => m.id));
        return [...(history || []), ...pending.filter((m) => !seen.has(m.id))];
      });
      if (Array.isArray(transcriptHistory) && transcriptHistory.length > 0) {
        setTranscripts(transcriptHistory);
      }
    };

    const onReceiveMessage = (msg) => {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (activeTabRef.current !== "chat") {
        setUnreadChat((c) => c + 1);
      }
      // Clear the sender's typing indicator immediately
      if (msg.userId) {
        setTypingUsers((prev) => {
          if (!prev[msg.userId]) return prev;
          const next = { ...prev };
          delete next[msg.userId];
          return next;
        });
      }
    };

    const onUserTyping = ({ userId, userName, isTyping }) => {
      if (!userId || userId === user._id) return;
      if (typingTimersRef.current[userId]) {
        clearTimeout(typingTimersRef.current[userId]);
        delete typingTimersRef.current[userId];
      }
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) next[userId] = userName;
        else delete next[userId];
        return next;
      });
      if (isTyping) {
        typingTimersRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 4000);
      }
    };

    const onReceiveTranscript = (t) => {
      if (!t.isFinal) return;
      setTranscripts((prev) => {
        if (t.id && prev.some((x) => x.id === t.id)) return prev;
        return [...prev, t];
      });
      showCaption(t.userName, t.text);
    };

    const onSpeakingStatus = ({ userId, isSpeaking }) => {
      if (!userId) return;
      setSpeakingStatus((prev) => ({ ...prev, [userId]: isSpeaking }));
    };

    const onReactionReceived = (reaction) => {
      setReactions((prev) => [...prev.slice(-20), reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3200);
    };

    const onMeetingEnded = () => {
      pushToast("The meeting has ended");
      setTimeout(() => navigate("/history"), 800);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room-users", onRoomUsers);
    socket.on("user-connected", onUserConnected);
    socket.on("user-disconnected", onUserDisconnected);
    socket.on("room-history", onRoomHistory);
    socket.on("receive-message", onReceiveMessage);
    socket.on("user-typing", onUserTyping);
    socket.on("receive-transcript", onReceiveTranscript);
    socket.on("speaking-status", onSpeakingStatus);
    socket.on("reaction-received", onReactionReceived);
    socket.on("meeting-ended", onMeetingEnded);

    // Socket may already be live (connected in AuthContext)
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.emit("leave-room");
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room-users", onRoomUsers);
      socket.off("user-connected", onUserConnected);
      socket.off("user-disconnected", onUserDisconnected);
      socket.off("room-history", onRoomHistory);
      socket.off("receive-message", onReceiveMessage);
      socket.off("user-typing", onUserTyping);
      socket.off("receive-transcript", onReceiveTranscript);
      socket.off("speaking-status", onSpeakingStatus);
      socket.off("reaction-received", onReactionReceived);
      socket.off("meeting-ended", onMeetingEnded);

      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [user, roomId, navigate, joinRoom, callPeer, closeCallToPeer, pushToast, showCaption]);

  // ---------------------------------------------------------
  // MEETING DETAILS + TIMER
  // ---------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    api
      .get(`/meetings/${roomId}/details`)
      .then((res) => {
        if (!mounted || !res.data.success) return;
        setMeetingTitle(res.data.meeting.title || "");
        const host = res.data.meeting.host;
        setHostId(host?._id || host || null);
        if (res.data.meeting.startTime) {
          setMeetingStartTime((prev) => prev || new Date(res.data.meeting.startTime));
        }
      })
      .catch(() => {
        /* details are non-critical for the live call */
      });
    return () => {
      mounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!meetingStartTime) return;
    const tick = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - meetingStartTime.getTime()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  const handleSetActiveTab = useCallback((tab) => {
    setActiveRightTab(tab);
    if (tab === "chat") setUnreadChat(0);
  }, []);

  // ---------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------
  const handleSendMessage = useCallback(
    (text) => {
      const clientId = makeClientId();
      const optimistic = {
        id: clientId,
        clientId,
        userName: user.fullName,
        userId: user._id,
        message: text,
        timestamp: new Date(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      let settled = false;
      const markFailed = () => {
        setMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, status: "failed" } : m))
        );
      };

      const timeout = setTimeout(() => {
        if (!settled) markFailed();
      }, MESSAGE_ACK_TIMEOUT_MS);

      socket.emit("send-message", { roomId, message: text, clientId }, (ack) => {
        settled = true;
        clearTimeout(timeout);
        if (ack?.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientId === clientId
                ? { ...m, id: ack.id, timestamp: ack.timestamp, status: "sent" }
                : m
            )
          );
        } else {
          markFailed();
        }
      });

      // Stop the typing indicator right away
      if (typingEmitRef.current.timer) clearTimeout(typingEmitRef.current.timer);
      if (typingEmitRef.current.isTyping) {
        typingEmitRef.current.isTyping = false;
        socket.emit("typing", { roomId, isTyping: false });
      }
    },
    [roomId, user]
  );

  const handleTyping = useCallback(() => {
    const state = typingEmitRef.current;
    if (!state.isTyping) {
      state.isTyping = true;
      socket.emit("typing", { roomId, isTyping: true });
    }
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.isTyping = false;
      socket.emit("typing", { roomId, isTyping: false });
    }, TYPING_IDLE_MS);
  }, [roomId]);

  const handleToggleMic = useCallback(() => {
    toggleMute();
    // isMuted state hasn't flipped yet — send the next value
    socket.emit("toggle-mute", { roomId, isMuted: !isMuted });
  }, [toggleMute, isMuted, roomId]);

  const handleSendReaction = useCallback(
    (emoji) => {
      socket.emit("send-reaction", { roomId, emoji });
    },
    [roomId]
  );

  const handleEndMeeting = useCallback(async () => {
    if (isEndingMeeting) return;
    setIsEndingMeeting(true);

    socket.emit("end-meeting", { roomId }, () => {});
    try {
      await api.post("/meetings/generate-summary", { roomId });
    } catch {
      // Summary failure shouldn't trap the user in the room —
      // History offers a retry.
    } finally {
      navigate("/history");
    }
  }, [isEndingMeeting, roomId, navigate]);

  const handleLeaveMeeting = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const copyRoomCode = useCallback(() => {
    navigator.clipboard?.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  // ---------------------------------------------------------
  // DERIVED
  // ---------------------------------------------------------
  const allParticipants = useMemo(() => {
    const list = participants.map((p) => ({
      ...p,
      isSelf: p.userId === user?._id,
      isMuted: p.userId === user?._id ? isMuted : p.isMuted,
    }));
    if (user && !list.some((p) => p.isSelf)) {
      list.unshift({
        userId: user._id,
        userName: user.fullName,
        isSelf: true,
        isMuted,
      });
    }
    // Self first, then join order
    return list.sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0));
  }, [participants, user, isMuted]);

  const typingNames = useMemo(() => Object.values(typingUsers), [typingUsers]);
  const isHost = !!(hostId && user && hostId === user._id);

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col overflow-hidden">
      <TopBar
        meetingTitle={meetingTitle}
        roomId={roomId}
        copied={copied}
        onCopyRoom={copyRoomCode}
        elapsedSeconds={elapsedSeconds}
        participantCount={allParticipants.length}
        transcriptionEnabled={transcriptionEnabled}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          participants={allParticipants}
          speakingStatus={speakingStatus}
          hostId={hostId}
          onInvite={() => setShowInviteModal(true)}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <MeetingStage
            participants={allParticipants}
            speakingStatus={speakingStatus}
            onInvite={() => setShowInviteModal(true)}
            captions={transcriptionEnabled ? captions : null}
          />

          {/* FLOATING REACTIONS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {reactions.map((r) => (
              <div
                key={r.id}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${r.x}%`, animation: "float-up 3s ease-out forwards" }}
              >
                <span className="text-3xl">{r.emoji}</span>
                <span className="text-[10px] text-[var(--text-secondary)] bg-black/40 rounded-full px-2 py-0.5 mt-1">
                  {r.userName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDEBAR — desktop inline, mobile overlay */}
        <div
          className={`${
            showMobileSidebar
              ? "fixed inset-0 z-40 bg-black/60 sm:static sm:bg-transparent"
              : "hidden"
          } sm:block sm:relative`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMobileSidebar(false);
          }}
        >
          <div className="absolute right-0 top-0 h-full w-full max-w-[360px] sm:static sm:max-w-none sm:h-full">
            <RightSidebar
              activeTab={activeRightTab}
              setActiveTab={handleSetActiveTab}
              messages={messages}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              typingUsers={typingNames}
              transcripts={transcripts}
              meetingTitle={meetingTitle}
              meetingId={roomId}
              socket={socket}
              currentUser={user}
              unreadChat={unreadChat}
            />
          </div>
        </div>
      </div>

      <ControlBar
        isMuted={isMuted}
        onToggleMic={handleToggleMic}
        micReady={micReady}
        transcriptionEnabled={transcriptionEnabled}
        onToggleTranscription={() => setTranscriptionEnabled((v) => !v)}
        onSendReaction={handleSendReaction}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeeting={handleEndMeeting}
        isEndingMeeting={isEndingMeeting}
        isHost={isHost}
        onToggleSidebar={() => setShowMobileSidebar((v) => !v)}
      />

      {/* HIDDEN AUDIO SINKS */}
      <div className="hidden">
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <AudioPlayer key={peerId} stream={stream} />
        ))}
      </div>

      {/* CONNECTION BANNER */}
      {!socketConnected && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm text-[var(--warning)] animate-fade-in-up">
          <WifiOff className="w-4 h-4" />
          Connection lost — reconnecting…
        </div>
      )}

      {/* MIC ERROR BANNER */}
      {micError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl glass px-4 py-2.5 text-sm text-[var(--danger)] animate-fade-in-up max-w-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{micError}</span>
          <button
            onClick={retryMic}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:bg-white/16 transition shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass rounded-xl px-4 py-2 text-sm animate-fade-in-up ${
              toast.tone === "error" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <InviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
        meetingTitle={meetingTitle}
      />
    </div>
  );
}

function AudioPlayer({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {
      // Autoplay may be blocked until user interacts — retry on gesture
      const resume = () => {
        el.play().catch(() => {});
        document.removeEventListener("click", resume);
      };
      document.addEventListener("click", resume);
    });
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

export default MeetingLayout;
