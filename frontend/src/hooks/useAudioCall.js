import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import api from "../lib/api";

// ============================================================
// TURN credentials come from our backend so the API key never
// reaches the browser. Falls back to public STUN.
// ============================================================
const getIceServers = async () => {
  try {
    const res = await api.get("/meetings/turn-credentials");
    const iceServers = res.data.iceServers || res.data;
    if (Array.isArray(iceServers) && iceServers.length > 0) {
      return iceServers;
    }
    throw new Error("Invalid iceServers response");
  } catch {
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }
};

const SPEAKING_THRESHOLD = 18; // average frequency amplitude 0-255
const SPEAKING_CHECK_MS = 150;

/**
 * Owns the entire audio-call lifecycle: PeerJS connection, mic
 * acquisition with retry, call management, active-speaker
 * detection, and — critically — full cleanup on unmount (the
 * previous implementation leaked the peer, the mic stream, and
 * a polling interval on every navigation).
 */
export default function useAudioCall({ enabled, onPeerOpen, onSpeakingChange }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState("");
  const [micReady, setMicReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallsRef = useRef({});
  const pendingCallsRef = useRef([]);
  const destroyedRef = useRef(false);
  const isMutedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const speakingRef = useRef(false);

  const onPeerOpenRef = useRef(onPeerOpen);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  useEffect(() => {
    onPeerOpenRef.current = onPeerOpen;
    onSpeakingChangeRef.current = onSpeakingChange;
  });

  const removeRemoteStream = (peerId) => {
    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  const wireCall = useCallback((call) => {
    activeCallsRef.current[call.peer] = call;

    call.on("stream", (remoteStream) => {
      setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }));
    });

    const cleanup = () => {
      removeRemoteStream(call.peer);
      if (activeCallsRef.current[call.peer] === call) {
        delete activeCallsRef.current[call.peer];
      }
    };
    call.on("close", cleanup);
    call.on("error", cleanup);
  }, []);

  const callPeer = useCallback(
    (peerId) => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed || !peerId) return;
      if (activeCallsRef.current[peerId]) return;

      if (!localStreamRef.current) {
        if (!pendingCallsRef.current.includes(peerId)) {
          pendingCallsRef.current.push(peerId);
        }
        return;
      }

      try {
        const call = peer.call(peerId, localStreamRef.current);
        if (call) wireCall(call);
      } catch (err) {
        console.warn("Failed to call peer:", err.message);
      }
    },
    [wireCall]
  );

  const closeCallToPeer = useCallback((peerId) => {
    const call = activeCallsRef.current[peerId];
    if (call) {
      try {
        call.close();
      } catch {
        /* already closed */
      }
      delete activeCallsRef.current[peerId];
    }
    removeRemoteStream(peerId);
  }, []);

  // ----------------------------------------------------------
  // Active speaker detection on the local stream
  // ----------------------------------------------------------
  const startSpeakingDetection = useCallback((stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        if (isMutedRef.current) {
          if (speakingRef.current) {
            speakingRef.current = false;
            setIsSpeaking(false);
            onSpeakingChangeRef.current?.(false);
          }
          return;
        }
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > SPEAKING_THRESHOLD;
        if (speaking !== speakingRef.current) {
          speakingRef.current = speaking;
          setIsSpeaking(speaking);
          onSpeakingChangeRef.current?.(speaking);
        }
      }, SPEAKING_CHECK_MS);

      return interval;
    } catch {
      return null;
    }
  }, []);

  // ----------------------------------------------------------
  // Mic acquisition with retry
  // ----------------------------------------------------------
  const speakingIntervalRef = useRef(null);

  const acquireMic = useCallback(async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      if (destroyedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMutedRef.current;
      });
      setMicReady(true);

      speakingIntervalRef.current = startSpeakingDetection(stream);

      // Flush calls queued while the mic was pending
      pendingCallsRef.current.forEach((peerId) => callPeer(peerId));
      pendingCallsRef.current = [];
    } catch (err) {
      const messages = {
        NotAllowedError:
          "Microphone access was denied. Allow the mic in your browser settings, then retry.",
        NotFoundError: "No microphone was found on this device.",
        NotReadableError: "Your microphone is in use by another application.",
        SecurityError: "Microphone requires a secure (HTTPS) connection.",
      };
      setMicError(messages[err.name] || `Could not access microphone: ${err.message}`);
      setMicReady(false);
    }
  }, [callPeer, startSpeakingDetection]);

  // ----------------------------------------------------------
  // Peer lifecycle
  // ----------------------------------------------------------
  useEffect(() => {
    if (!enabled) return;
    destroyedRef.current = false;

    let healthCheck = null;

    const init = async () => {
      const iceServers = await getIceServers();
      if (destroyedRef.current) return;

      const peer = new Peer(undefined, {
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
      });
      peerRef.current = peer;

      peer.on("open", (peerId) => {
        onPeerOpenRef.current?.(peerId);
      });

      peer.on("call", (call) => {
        call.answer(localStreamRef.current || undefined);
        wireCall(call);
      });

      // The signalling connection dropped — PeerJS can recover it
      peer.on("disconnected", () => {
        if (!destroyedRef.current && !peer.destroyed) {
          peer.reconnect();
        }
      });

      peer.on("error", (err) => {
        // "peer-unavailable" is routine (they left mid-call); others log
        if (err.type !== "peer-unavailable") {
          console.warn("PeerJS error:", err.type, err.message);
        }
      });

      await acquireMic();

      // Sweep dead call objects so state never drifts
      healthCheck = setInterval(() => {
        Object.entries(activeCallsRef.current).forEach(([peerId, call]) => {
          if (!call || !call.open) {
            delete activeCallsRef.current[peerId];
            removeRemoteStream(peerId);
          }
        });
      }, 5000);
    };

    init();

    return () => {
      destroyedRef.current = true;
      if (healthCheck) clearInterval(healthCheck);
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);

      Object.values(activeCallsRef.current).forEach((call) => {
        try {
          call.close();
        } catch {
          /* noop */
        }
      });
      activeCallsRef.current = {};
      pendingCallsRef.current = [];

      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch {
          /* noop */
        }
        peerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }

      setRemoteStreams({});
      setMicReady(false);
    };
  }, [enabled, acquireMic, wireCall]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  return {
    remoteStreams,
    isMuted,
    toggleMute,
    micError,
    micReady,
    retryMic: acquireMic,
    isSpeaking,
    callPeer,
    closeCallToPeer,
  };
}
