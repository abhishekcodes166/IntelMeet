import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Peer from "peerjs";
import axios from "axios";

import socket from "../socket";
import useAuth from "../context/AuthContext";

function Meeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [liveTranscripts, setLiveTranscripts] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [speakingUsers, setSpeakingUsers] = useState({});
  const [error, setError] = useState("");
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallsRef = useRef({});

  // =========================================
  // CLEANUP PEER
  // =========================================
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

  // =========================================
  // MAIN MEETING LOGIC
  // =========================================
  useEffect(() => {
    if (!user) return;

    const initializeMeeting = async () => {
      try {
        // =====================================
        // GET MICROPHONE
        // =====================================
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log("MIC STREAM READY");

        localStreamRef.current = stream;

        // =====================================
        // CREATE PEER
        // =====================================
        const peer = new Peer(undefined, {
          debug: 2,
        });

        peerRef.current = peer;

        // =====================================
        // PEER OPEN
        // =====================================
        peer.on("open", (peerId) => {
          console.log("MY PEER ID:", peerId);

          socket.connect();

          socket.emit("join-room", {
            roomId,
            peerId,
            userName: user.fullName,
            userId: user._id,
          });
        });

        // =====================================
        // RECEIVE CALL
        // =====================================
        peer.on("call", (call) => {
          console.log("INCOMING CALL:", call.peer);

          activeCallsRef.current[call.peer] = call;

          // ANSWER CALL WITH AUDIO STREAM
          call.answer(stream);

          call.on("stream", (remoteStream) => {
            console.log("REMOTE AUDIO RECEIVED");

            setRemoteStreams((prev) => ({
              ...prev,
              [call.peer]: remoteStream,
            }));
          });

          call.on("close", () => {
            cleanupPeer(call.peer);
          });

          call.on("error", (err) => {
            console.error("CALL ERROR:", err);
            cleanupPeer(call.peer);
          });
        });

        // =====================================
        // USER CONNECTED
        // =====================================
        socket.on("user-connected", ({ peerId }) => {
          console.log("NEW USER CONNECTED:", peerId);

          if (!peerId) return;

          // PREVENT DUPLICATE CALLS
          if (activeCallsRef.current[peerId]) return;

          const call = peer.call(peerId, stream);

          activeCallsRef.current[peerId] = call;

          call.on("stream", (remoteStream) => {
            console.log("OUTGOING REMOTE STREAM RECEIVED");

            setRemoteStreams((prev) => ({
              ...prev,
              [peerId]: remoteStream,
            }));
          });

          call.on("close", () => {
            cleanupPeer(peerId);
          });

          call.on("error", (err) => {
            console.error("OUTGOING CALL ERROR:", err);
            cleanupPeer(peerId);
          });
        });

        // =====================================
        // ROOM USERS
        // =====================================
        socket.on("room-users", (users) => {
          setParticipants(users);
        });

        // =====================================
        // USER DISCONNECTED
        // =====================================
        socket.on("user-disconnected", ({ peerId }) => {
          cleanupPeer(peerId);
        });

        // =====================================
        // RECEIVE MESSAGE
        // =====================================
        socket.on("receive-message", (message) => {
          setMessages((prev) => [...prev, message]);
        });

        // =====================================
        // RECEIVE TRANSCRIPT
        // =====================================
        socket.on(
          "receive-transcript",
          ({ userName, text, isFinal, timestamp }) => {
            if (userName === user.fullName) return;

            setLiveTranscripts((prev) => {
              const last = prev[prev.length - 1];

              if (
                last &&
                last.userName === userName &&
                !last.isFinal
              ) {
                return [
                  ...prev.slice(0, -1),
                  {
                    userName,
                    text,
                    isFinal,
                    timestamp,
                  },
                ];
              }

              return [
                ...prev,
                {
                  userName,
                  text,
                  isFinal,
                  timestamp,
                },
              ];
            });
          }
        );

        // =====================================
        // SPEAKING STATUS
        // =====================================
        socket.on(
          "user-speaking-status",
          ({ socketId, isSpeaking }) => {
            setSpeakingUsers((prev) => ({
              ...prev,
              [socketId]: isSpeaking,
            }));
          }
        );

        // =====================================
        // MEETING ENDED
        // =====================================
        socket.on("meeting-ended-signal", () => {
          navigate("/history");
        });

      } catch (err) {
        console.error("MIC ERROR:", err);

        setError(
          "Microphone permission denied. Please allow microphone access."
        );
      }
    };

    initializeMeeting();

    // =====================================
    // CLEANUP
    // =====================================
    return () => {
      socket.off("user-connected");
      socket.off("room-users");
      socket.off("user-disconnected");
      socket.off("receive-message");
      socket.off("receive-transcript");
      socket.off("user-speaking-status");
      socket.off("meeting-ended-signal");

      Object.values(activeCallsRef.current).forEach((call) => {
        call.close();
      });

      activeCallsRef.current = {};

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [roomId, user, navigate]);

  // =========================================
  // SEND MESSAGE
  // =========================================
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    socket.emit("send-message", {
      roomId,
      userName: user.fullName,
      userId: user._id,
      message: chatInput,
    });

    setChatInput("");
  };

  // =========================================
  // END MEETING
  // =========================================
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

      navigate("/history");
    } catch (err) {
      console.error("END MEETING ERROR:", err);
    } finally {
      setIsEndingMeeting(false);
    }
  };

  // =========================================
  // LEAVE MEETING
  // =========================================
  const handleLeaveMeeting = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-bold mb-4">
        Secure Audio Room
      </h1>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* PARTICIPANTS */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Participants ({participants.length})
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {participants.map((participant) => (
            <div
              key={participant.socketId}
              className="bg-zinc-900 rounded-xl p-4"
            >
              <h3 className="font-bold">
                {participant.userName}
              </h3>

              <p>
                {speakingUsers[participant.socketId]
                  ? "Speaking..."
                  : "Listening"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AUDIO ELEMENTS */}
      <div>
        {Object.entries(remoteStreams).map(
          ([peerId, stream]) => (
            <audio
              key={peerId}
              autoPlay
              playsInline
              ref={(audio) => {
                if (audio && stream) {
                  audio.srcObject = stream;
                }
              }}
            />
          )
        )}
      </div>

      {/* CHAT */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6">
        <h2 className="text-xl font-bold mb-3">Chat</h2>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <span className="font-bold">
                {msg.userName}:{" "}
              </span>
              {msg.message}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) =>
              setChatInput(e.target.value)
            }
            className="flex-1 bg-black border border-zinc-700 rounded-lg p-2"
            placeholder="Type a message..."
          />

          <button
            onClick={handleSendMessage}
            className="bg-lime-400 text-black px-4 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>

      {/* TRANSCRIPTS */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6">
        <h2 className="text-xl font-bold mb-3">
          Live Transcript
        </h2>

        <div className="space-y-2">
          {liveTranscripts.map((t, idx) => (
            <div key={idx}>
              <span className="font-bold">
                {t.userName}:{" "}
              </span>
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4">
        <button
          onClick={handleLeaveMeeting}
          className="bg-zinc-700 px-5 py-3 rounded-xl"
        >
          Leave Room
        </button>

        <button
          onClick={handleEndMeeting}
          className="bg-red-500 px-5 py-3 rounded-xl"
        >
          End Meeting
        </button>
      </div>
    </div>
  );
}

export default Meeting;