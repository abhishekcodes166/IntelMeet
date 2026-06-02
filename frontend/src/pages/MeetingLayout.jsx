import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Peer from "peerjs";
import axios from "axios";
import {
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Loader2,
  Copy,
  Users,
  Share2,
  Settings,
  LogOut,
  Radio,
  Zap,
  FileText,
  MessageSquare,
  PenTool,
  BarChart3,
  HelpCircle,
  MessageCircle,
} from "lucide-react";

import socket from "../socket";
import Whiteboard from "../components/Whiteboard";
import Poll from "../components/Poll";
import FileSharing from "../components/FileSharing";
import NotificationCenter from "../components/NotificationCenter";
import RecordingIndicator from "../components/RecordingIndicator";
import LeftSidebar from "../components/LeftSidebar";
import TopBar from "../components/TopBar";
import MeetingStage from "../components/MeetingStage";
import LiveTranscript from "../components/LiveTranscript";
import RightSidebar from "../components/RightSidebar";
import ControlBar from "../components/ControlBar";

function useSpeechRecognition({ onTranscript, enabled }) {
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            onTranscript(transcript, true);
          }
        }
      }
    };

    recognition.onerror = () => {};

    recognition.onend = () => {
      if (enabled) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [enabled, onTranscript]);
}

const getTurnCredentials = async () => {
  try {
    const res = await axios.get("/meetings/turn-credentials");
    const iceServers = res.data.iceServers || res.data;
    if (!Array.isArray(iceServers) || iceServers.length === 0) {
      throw new Error("Invalid iceServers response");
    }
    console.log("✓ TURN credentials fetched:", iceServers.length, "servers");
    return iceServers;
  } catch (err) {
    console.warn("TURN fetch failed, falling back to STUN only:", err.message);
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }
};

function MeetingLayout() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [participants, setParticipants] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [activeRightTab, setActiveRightTab] = useState("chat");
  const [copied, setCopied] = useState(false);
  const [liveTranscripts, setLiveTranscripts] = useState([]);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speakingStatus, setSpeakingStatus] = useState({});

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallsRef = useRef({});
  const pendingPeerCallsRef = useRef([]);
  const chatBottomRef = useRef(null);
  const transcriptBottomRef = useRef(null);

  const handleTranscript = useCallback(
    (text, isFinal) => {
      if (!user) return;

      socket.emit("send-transcript", {
        roomId,
        userName: user.fullName,
        userId: user._id,
        text,
        isFinal,
      });

      setLiveTranscripts((prev) => [
        ...prev,
        {
          userName: user.fullName,
          userId: user._id,
          text,
          isFinal,
          timestamp: new Date(),
        },
      ]);
    },
    [roomId, user]
  );

  useSpeechRecognition({
    onTranscript: handleTranscript,
    enabled: transcriptionEnabled && !isMuted,
  });

  useEffect(() => {
    if (!user) return;

    let peer;

    const initPeer = async () => {
      const iceServers = await getTurnCredentials();

      const peerConfig = {
        host: "0.peerjs.com",
        port: 443,
        path: "/",
        secure: true,
        config: {
          iceServers,
          iceCandidatePoolSize: 10,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        },
      };

      peer = new Peer(undefined, peerConfig);
      peerRef.current = peer;

      peer.on("error", (err) => {
        console.error("PeerJS error:", err);
      });

      const makeCallToPeer = (peerId) => {
        if (!peer || activeCallsRef.current[peerId]) return;

        const stream = localStreamRef.current;
        const call = stream ? peer.call(peerId, stream) : peer.call(peerId);
        activeCallsRef.current[peerId] = call;

        call.on("stream", (remoteStream) => {
          setRemoteStreams((prev) => ({ ...prev, [peerId]: remoteStream }));
        });

        call.on("close", () => {
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[peerId];
            return updated;
          });
          delete activeCallsRef.current[peerId];
        });
      };

      const handleUserConnected = ({ peerId }) => {
        if (!peerId || activeCallsRef.current[peerId]) return;
        if (localStreamRef.current) {
          makeCallToPeer(peerId);
        } else {
          pendingPeerCallsRef.current.push(peerId);
        }
      };

      peer.on("open", (peerId) => {
        socket.emit("join-room", {
          roomId,
          peerId,
          userName: user.fullName,
          userId: user._id,
        });
      });

      peer.on("call", (call) => {
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
        } else {
          call.answer();
        }

        activeCallsRef.current[call.peer] = call;

        call.on("stream", (remoteStream) => {
          setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }));
        });

        call.on("close", () => {
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[call.peer];
            return updated;
          });
          delete activeCallsRef.current[call.peer];
        });
      });

      socket.on("user-connected", handleUserConnected);

      const acquireAudio = async (attemptNumber = 1) => {
        const MAX_RETRIES = 3;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });

          localStreamRef.current = stream;
          stream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });

          setError("");

          pendingPeerCallsRef.current.forEach((peerId) => {
            makeCallToPeer(peerId);
          });
          pendingPeerCallsRef.current = [];

          console.log("✓ Audio stream acquired successfully");
        } catch (err) {
          console.error("Audio acquisition failed:", err);

          if (attemptNumber < MAX_RETRIES) {
            setTimeout(() => acquireAudio(attemptNumber + 1), 2000);
          } else {
            const errMsg =
              err.name === "NotAllowedError"
                ? "Microphone permission denied"
                : err.name === "NotFoundError"
                ? "No microphone found"
                : "Could not access microphone";
            setError(errMsg);
          }
        }
      };

      acquireAudio();

      return () => {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        socket.off("user-connected", handleUserConnected);
      };
    };

    initPeer();

    socket.on("user-joined", (userData) => {
      setParticipants((prev) => {
        const exists = prev.some(
          (p) => p.userId === userData.userId
        );
        if (exists) return prev;
        return [...prev, { ...userData, isMuted: false }];
      });
    });

    socket.on("user-left", (data) => {
      setParticipants((prev) =>
        prev.filter((p) => p.userId !== data.userId)
      );
      if (activeCallsRef.current[data.peerId]) {
        activeCallsRef.current[data.peerId].close();
        delete activeCallsRef.current[data.peerId];
      }
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("receive-transcript", (transcript) => {
      setLiveTranscripts((prev) => [...prev, transcript]);
    });

    socket.on("toggle-mute-status", (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId ? { ...p, isMuted: data.isMuted } : p
        )
      );
    });

    socket.on("speaking-status", (data) => {
      setSpeakingStatus((prev) => ({
        ...prev,
        [data.userId]: data.isSpeaking,
      }));
    });

    socket.on("end-meeting", () => {
      navigate("/history");
    });

    return () => {
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("receive-message");
      socket.off("receive-transcript");
      socket.off("toggle-mute-status");
      socket.off("speaking-status");
      socket.off("end-meeting");
    };
  }, [user, roomId, navigate]);

  useEffect(() => {
    let mounted = true;
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`/meetings/${roomId}/details`);
        if (res.data.success && mounted) {
          setMeetingTitle(res.data.meeting.title || "");
        }
      } catch (err) {
        // ignore silently
      }
    };
    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveTranscripts]);

  const toggleMic = () => {
    const next = !isMuted;
    setIsMuted(next);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }

    socket.emit("toggle-mute", { roomId, isMuted: next });

    if (next) setTranscriptionEnabled(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    socket.emit("send-message", {
      roomId,
      userName: user.fullName,
      userId: user._id,
      message: chatInput,
      timestamp: new Date(),
    });

    setMessages((prev) => [
      ...prev,
      {
        userName: user.fullName,
        userId: user._id,
        message: chatInput,
        timestamp: new Date(),
      },
    ]);

    setChatInput("");
  };

  const handleEndMeeting = async () => {
    if (isEndingMeeting) return;
    setIsEndingMeeting(true);

    try {
      socket.emit("end-meeting", { roomId, userId: user._id });
      await axios.post("/meetings/generate-summary", { roomId });
    } catch (err) {
      console.log(err);
    } finally {
      navigate("/history");
    }
  };

  const handleLeaveMeeting = () => {
    navigate("/");
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#09090B] text-white min-h-screen flex flex-col">
      {/* TOP BAR */}
      <TopBar
        meetingTitle={meetingTitle}
        roomId={roomId}
        copied={copied}
        onCopyRoom={copyRoomCode}
      />

      {/* MAIN CONTENT - 3 PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <LeftSidebar
          roomId={roomId}
          participants={participants}
          currentUser={user}
          speakingStatus={speakingStatus}
        />

        {/* CENTER AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* MEETING STAGE */}
          <MeetingStage
            participants={participants}
            currentUser={user}
            remoteStreams={remoteStreams}
            speakingStatus={speakingStatus}
            isMuted={isMuted}
          />

          {/* LIVE TRANSCRIPT */}
          <LiveTranscript
            transcripts={liveTranscripts}
            transcriptBottomRef={transcriptBottomRef}
          />
        </div>

        {/* RIGHT SIDEBAR */}
        <RightSidebar
          activeTab={activeRightTab}
          setActiveTab={setActiveRightTab}
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={handleSendMessage}
          chatBottomRef={chatBottomRef}
          meetingId={roomId}
          socket={socket}
          currentUser={user}
        />
      </div>

      {/* BOTTOM CONTROL BAR */}
      <ControlBar
        isMuted={isMuted}
        onToggleMic={toggleMic}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeeting={handleEndMeeting}
        isEndingMeeting={isEndingMeeting}
      />

      {/* HIDDEN AUDIO PLAYERS */}
      <div className="hidden">
        {Object.keys(remoteStreams).map((peerId) => (
          <AudioPlayer key={peerId} stream={remoteStreams[peerId]} />
        ))}
      </div>

      {/* ERROR NOTIFICATION */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 px-5 py-3 text-[#EF4444]">
          {error}
        </div>
      )}

      <NotificationCenter socket={socket} userId={user?._id} />
    </div>
  );
}

function AudioPlayer({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !stream) return;
    audioRef.current.srcObject = stream;
    audioRef.current.play().catch((err) => {
      console.log("Audio play error:", err);
    });
  }, [stream]);

  return <audio ref={audioRef} />;
}

export default MeetingLayout;
