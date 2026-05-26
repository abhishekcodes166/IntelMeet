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
  Sparkles,
} from "lucide-react";

import socket from "../socket";

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

function Meeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();

  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");
  const [copied, setCopied] = useState(false);
  const [liveTranscripts, setLiveTranscripts] = useState([]);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [error, setError] = useState("");

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallsRef = useRef({});

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

    const peer = new Peer();

    peerRef.current = peer;

    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: false,
      })
      .then((stream) => {
        localStreamRef.current = stream;

        peer.on("open", (peerId) => {
          socket.emit("join-room", {
            roomId,
            peerId,
            userName: user.fullName,
            userId: user._id,
          });
        });

        peer.on("call", (call) => {
          call.answer(stream);

          call.on("stream", (remoteStream) => {
            setRemoteStreams((prev) => ({
              ...prev,
              [call.peer]: remoteStream,
            }));
          });

          activeCallsRef.current[call.peer] = call;

          call.on("close", () => {
            setRemoteStreams((prev) => {
              const updated = { ...prev };
              delete updated[call.peer];
              return updated;
            });

            delete activeCallsRef.current[call.peer];
          });
        });

        socket.on("user-connected", ({ peerId }) => {
          if (activeCallsRef.current[peerId]) return;

          const call = peer.call(peerId, stream);

          activeCallsRef.current[peerId] = call;

          call.on("stream", (remoteStream) => {
            setRemoteStreams((prev) => ({
              ...prev,
              [peerId]: remoteStream,
            }));
          });

          call.on("close", () => {
            setRemoteStreams((prev) => {
              const updated = { ...prev };
              delete updated[peerId];
              return updated;
            });

            delete activeCallsRef.current[peerId];
          });
        });
      })
      .catch(() => {
        setError("Microphone access denied.");
      });

    socket.on("room-users", (users) => {
      setParticipants(users);
    });

    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("receive-transcript", (data) => {
      setLiveTranscripts((prev) => [...prev, data]);
    });

    socket.on("meeting-ended-signal", () => {
      navigate("/history");
    });

    socket.on("user-disconnected", ({ peerId }) => {
  if (activeCallsRef.current[peerId]) {
    activeCallsRef.current[peerId].close();
    delete activeCallsRef.current[peerId];
  }

  setRemoteStreams((prev) => {
    const updated = { ...prev };
    delete updated[peerId];
    return updated;
  });
});

    return () => {
      socket.off("user-connected");
      socket.off("user-disconnected");
      socket.off("room-users");
      socket.off("receive-message");
      socket.off("receive-transcript");
      socket.off("meeting-ended-signal");

      Object.values(activeCallsRef.current).forEach((call) => {
        call.close();
      });

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [roomId, user, navigate]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [liveTranscripts]);

  const toggleMic = () => {
    const next = !isMuted;

    setIsMuted(next);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
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

    setChatInput("");
  };

  const handleEndMeeting = async () => {
    if (isEndingMeeting) return;

    setIsEndingMeeting(true);

    try {
      socket.emit("end-meeting", { roomId });

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/meetings/generate-summary`,
        { roomId },
        { withCredentials: true }
      );
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

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#fdf9f0]">
      <header className="border-b border-[#fdf9f0]/10 bg-[#141414]/95 px-6 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#c7ff69] px-4 py-2 text-black font-semibold text-sm">
              <Sparkles className="h-4 w-4" />
              Live meeting room
            </div>

            <div className="mt-4 flex items-center gap-3">
              <h1 className="text-4xl font-black">
                Secure Audio Room
              </h1>

              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                Room ID: {roomId}
              </span>
            </div>
          </div>

          <button
            onClick={copyRoomCode}
            className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold"
          >
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-6 py-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-6">
          <div className="rounded-[43px] border border-white/10 p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-[#c7ff69] uppercase text-sm">
                  Room status
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Live session
                </h2>
              </div>

              <div className="rounded-full border border-[#c7ff69]/20 px-4 py-2 text-[#c7ff69]">
                Transcription active
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[43px] bg-[#7a78ff] p-6">
              <p className="uppercase text-sm">
                Host controls
              </p>

              <h3 className="mt-3 text-3xl font-black">
                {isMuted ? "Muted" : "Microphone on"}
              </h3>
            </div>

            <div className="rounded-[43px] bg-[#00a652] p-6">
              <p className="uppercase text-sm">
                Participants
              </p>

              <h3 className="mt-3 text-3xl font-black">
                {participants.length + 1}
              </h3>
            </div>
          </div>

          <div className="rounded-[43px] border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="uppercase text-sm text-[#7a78ff]">
                  Participants
                </p>

                <h3 className="mt-2 text-3xl font-black">
                  Live grid
                </h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ParticipantTile
                name={user?.fullName}
                isSelf
                isMuted={isMuted}
              />

              {participants
                .filter((p) => p.userId !== user?._id)
                .map((participant) => (
                  <ParticipantTile
                    key={participant.socketId}
                    name={participant.userName}
                    isMuted={participant.isMuted}
                  />
                ))}
            </div>
          </div>
        </section>

        <aside>
          <div className="rounded-[43px] border border-white/10 p-5">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveSidebarTab("chat")}
                className={`rounded-full py-3 ${
                  activeSidebarTab === "chat"
                    ? "bg-white text-black"
                    : "bg-white/5"
                }`}
              >
                Chat
              </button>

              <button
                onClick={() => setActiveSidebarTab("transcript")}
                className={`rounded-full py-3 ${
                  activeSidebarTab === "transcript"
                    ? "bg-white text-black"
                    : "bg-white/5"
                }`}
              >
                Transcript
              </button>

              <button
                onClick={() => setActiveSidebarTab("people")}
                className={`rounded-full py-3 ${
                  activeSidebarTab === "people"
                    ? "bg-white text-black"
                    : "bg-white/5"
                }`}
              >
                People
              </button>
            </div>

            {activeSidebarTab === "chat" && (
              <div className="mt-5">
                <div className="h-[420px] overflow-y-auto space-y-3">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className="rounded-3xl bg-white/5 p-4"
                    >
                      <p className="font-semibold">
                        {msg.userName}
                      </p>

                      <p className="mt-2 text-sm">
                        {msg.message}
                      </p>
                    </div>
                  ))}

                  <div ref={chatBottomRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="mt-4 flex gap-3"
                >
                  <input
                    value={chatInput}
                    onChange={(e) =>
                      setChatInput(e.target.value)
                    }
                    placeholder="Type a message..."
                    className="flex-1 rounded-full bg-white/5 px-5 py-4 outline-none"
                  />

                  <button
                    type="submit"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c7ff69] text-black"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            )}

            {activeSidebarTab === "transcript" && (
              <div className="mt-5 h-[420px] overflow-y-auto space-y-3">
                {liveTranscripts.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-3xl bg-white/5 p-4"
                  >
                    <p className="font-semibold text-[#c7ff69]">
                      {item.userName}
                    </p>

                    <p className="mt-2 text-sm">
                      {item.text}
                    </p>
                  </div>
                ))}

                <div ref={transcriptBottomRef} />
              </div>
            )}

            {activeSidebarTab === "people" && (
              <div className="mt-5 space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.socketId}
                    className="rounded-3xl bg-white/5 p-4"
                  >
                    {participant.userName}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="border-t border-white/10 px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={toggleMic}
            className={`rounded-full px-6 py-4 font-semibold ${
              isMuted
                ? "bg-[#ff6d38]"
                : "bg-[#c7ff69] text-black"
            }`}
          >
            {isMuted ? (
              <span className="flex items-center gap-2">
                <MicOff className="h-5 w-5" />
                Unmute
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Mute
              </span>
            )}
          </button>

          <button
            onClick={handleLeaveMeeting}
            className="rounded-full border border-white/10 px-6 py-4"
          >
            <span className="flex items-center gap-2">
              <PhoneOff className="h-5 w-5" />
              Leave room
            </span>
          </button>

          <button
            onClick={handleEndMeeting}
            disabled={isEndingMeeting}
            className="rounded-full bg-[#ff6d38] px-6 py-4 font-semibold text-black"
          >
            {isEndingMeeting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Ending...
              </span>
            ) : (
              "End for All"
            )}
          </button>
        </div>
      </footer>

      <div className="hidden">
        {Object.keys(remoteStreams).map((peerId) => (
          <AudioPlayer
            key={peerId}
            stream={remoteStreams[peerId]}
          />
        ))}
      </div>

      {error && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 rounded-full bg-red-500/10 border border-red-500/20 px-5 py-3 text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function ParticipantTile({
  name,
  isSelf,
  isMuted,
}) {
  return (
    <div className="rounded-[43px] border border-white/10 p-5 text-center">
      <div
        className={`mx-auto flex h-28 w-28 items-center justify-center rounded-[43px] ${
          isSelf
            ? "bg-[#7a78ff]"
            : "bg-[#1c1c1c]"
        }`}
      >
        <span className="text-4xl font-black">
          {name?.charAt(0)?.toUpperCase()}
        </span>
      </div>

      <p className="mt-4 font-semibold">
        {name}
      </p>

      {isMuted && (
        <div className="mt-2 flex justify-center">
          <MicOff className="h-4 w-4 text-[#ff6d38]" />
        </div>
      )}
    </div>
  );
}

function AudioPlayer({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !stream) return;

    audioRef.current.srcObject = stream;

    const playAudio = async () => {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.log("Audio autoplay blocked:", err);
      }
    };

    playAudio();
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

export default Meeting;