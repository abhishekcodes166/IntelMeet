import { useEffect, useRef, useState } from "react";

import {
    useParams,
    useSearchParams,
} from "react-router-dom";

import Peer from "peerjs";

import socket from "../socket";

function Meeting() {

    const { roomId } = useParams();

    const [searchParams] =
        useSearchParams();

    const userName =
        searchParams.get("name") ||
        "Guest";

    const myVideoRef = useRef(null);

    const peerInstance = useRef(null);

    const [remoteStreams, setRemoteStreams] =
        useState([]);

    const [participants, setParticipants] =
        useState([]);

    const [messages, setMessages] =
        useState([]);

    const [messageInput, setMessageInput] =
        useState("");

    const [transcript, setTranscript] =
        useState("");

    const [summary, setSummary] =
        useState("");

    const [loadingSummary, setLoadingSummary] =
        useState(false);

    const [isListening, setIsListening] =
        useState(false);

    const [isMuted, setIsMuted] =
        useState(false);

    const [isCameraOff, setIsCameraOff] =
        useState(false);

    // START VIDEO + SOCKETS
    useEffect(() => {

        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: true,
            })
            .then((stream) => {

                // MY VIDEO
                if (myVideoRef.current) {

                    myVideoRef.current.srcObject =
                        stream;

                }

                // CREATE PEER
                const peer = new Peer();

                peer.on("open", (peerId) => {

                    console.log(
                        "MY PEER ID:",
                        peerId
                    );

                    socket.emit(
                        "join-room",
                        {
                            roomId,
                            peerId,
                            userName,
                        }
                    );

                });

                // RECEIVE CALL
                peer.on("call", (call) => {

                    console.log(
                        "Receiving call"
                    );

                    call.answer(stream);

                    call.on(
                        "stream",
                        (remoteStream) => {

                            setRemoteStreams(
                                (prev) => {

                                    const alreadyExists =
                                        prev.find(
                                            (
                                                s
                                            ) =>
                                                s.id ===
                                                remoteStream.id
                                        );

                                    if (
                                        alreadyExists
                                    )
                                        return prev;

                                    return [
                                        ...prev,
                                        remoteStream,
                                    ];

                                }
                            );

                        }
                    );

                });

                // NEW USER CONNECTED
                socket.on(
                    "user-connected",
                    ({ peerId }) => {

                        console.log(
                            "NEW USER:",
                            peerId
                        );

                        const call =
                            peer.call(
                                peerId,
                                stream
                            );

                        call.on(
                            "stream",
                            (
                                remoteStream
                            ) => {

                                setRemoteStreams(
                                    (
                                        prev
                                    ) => {

                                        const alreadyExists =
                                            prev.find(
                                                (
                                                    s
                                                ) =>
                                                    s.id ===
                                                    remoteStream.id
                                            );

                                        if (
                                            alreadyExists
                                        )
                                            return prev;

                                        return [
                                            ...prev,
                                            remoteStream,
                                        ];

                                    }
                                );

                            }
                        );

                    }
                );

                // PARTICIPANTS
                socket.on(
                    "room-users",
                    (users) => {

                        setParticipants(
                            users
                        );

                    }
                );

                // RECEIVE CHAT
                socket.on(
                    "receive-message",
                    (
                        messageData
                    ) => {

                        setMessages(
                            (
                                prev
                            ) => [
                                ...prev,
                                messageData,
                            ]
                        );

                    }
                );

                // SPEECH RECOGNITION

                const SpeechRecognition =
                    window.SpeechRecognition ||
                    window.webkitSpeechRecognition;

                if (SpeechRecognition) {

                    const recognition =
                        new SpeechRecognition();

                    recognition.continuous =
                        true;

                    recognition.interimResults =
                        true;

                    recognition.lang =
                        "en-US";

                    recognition.onresult =
                        (event) => {

                            let finalTranscript =
                                "";

                            for (
                                let i =
                                    event.resultIndex;
                                i <
                                event.results.length;
                                i++
                            ) {

                                finalTranscript +=
                                    event.results[
                                        i
                                    ][0]
                                        .transcript +
                                    " ";

                            }

                            setTranscript(
                                finalTranscript
                            );

                        };

                    recognition.start();

                    setIsListening(
                        true
                    );

                }

                peerInstance.current =
                    peer;

            })
            .catch((error) => {

                console.log(
                    "MEDIA ERROR:",
                    error
                );

            });

        return () => {

            socket.off(
                "user-connected"
            );

            socket.off(
                "room-users"
            );

            socket.off(
                "receive-message"
            );

        };

    }, []);

    // SEND MESSAGE
    const sendMessage = () => {

        if (!messageInput.trim())
            return;

        socket.emit(
            "send-message",
            {
                roomId,
                userName,
                message:
                    messageInput,
            }
        );

        setMessageInput("");

    };

    // GENERATE SUMMARY
    const generateSummary =
        async () => {

            if (
                !transcript.trim()
            ) {

                alert(
                    "Transcript is empty"
                );

                return;

            }

            try {

                setLoadingSummary(
                    true
                );

                const response =
                    await fetch(
                        "http://localhost:8000/api/v1/ai/summary",
                        {
                            method:
                                "POST",

                            headers:
                                {
                                    "Content-Type":
                                        "application/json",
                                },

                            body: JSON.stringify(
                                {
                                    transcript,
                                }
                            ),
                        }
                    );

                const data =
                    await response.json();

                console.log(
                    data
                );

                if (
                    data.success
                ) {

                    setSummary(
                        data.summary
                    );

                }

            } catch (error) {

                console.log(
                    "SUMMARY ERROR:",
                    error
                );

            } finally {

                setLoadingSummary(
                    false
                );

            }

        };

    // TOGGLE MIC
    const toggleMic = () => {

        if (
            !myVideoRef.current
                ?.srcObject
        )
            return;

        const audioTrack =
            myVideoRef.current.srcObject.getAudioTracks()[0];

        audioTrack.enabled =
            !audioTrack.enabled;

        setIsMuted(
            !audioTrack.enabled
        );

    };

    // TOGGLE CAMERA
    const toggleCamera = () => {

        if (
            !myVideoRef.current
                ?.srcObject
        )
            return;

        const videoTrack =
            myVideoRef.current.srcObject.getVideoTracks()[0];

        videoTrack.enabled =
            !videoTrack.enabled;

        setIsCameraOff(
            !videoTrack.enabled
        );

    };

    // COPY ROOM CODE
    const copyRoomCode =
        async () => {

            await navigator.clipboard.writeText(
                roomId
            );

            alert(
                "Meeting code copied!"
            );

        };

    // LEAVE MEETING
    const leaveMeeting = () => {

        window.location.href = "/";

    };

    return (

        <div
            style={{
                minHeight:
                    "100vh",
                background:
                    "#0f172a",
                padding:
                    "20px",
                color: "white",
            }}
        >

            <h1
                style={{
                    textAlign:
                        "center",
                }}
            >
                AI Meet
            </h1>

            <h2
                style={{
                    textAlign:
                        "center",
                    opacity: 0.7,
                }}
            >
                Room ID: {roomId}
            </h2>

            {/* CONTROLS */}

            <div
                style={{
                    display:
                        "flex",
                    justifyContent:
                        "center",
                    gap: "15px",
                    marginTop:
                        "20px",
                    flexWrap:
                        "wrap",
                }}
            >

                <button
                    onClick={
                        toggleMic
                    }
                    style={
                        buttonStyle
                    }
                >
                    {isMuted
                        ? "Unmute Mic"
                        : "Mute Mic"}
                </button>

                <button
                    onClick={
                        toggleCamera
                    }
                    style={
                        buttonStyle
                    }
                >
                    {isCameraOff
                        ? "Turn Camera On"
                        : "Turn Camera Off"}
                </button>

                <button
                    onClick={
                        copyRoomCode
                    }
                    style={
                        buttonStyle
                    }
                >
                    Copy Meeting Code
                </button>

                <button
                    onClick={
                        generateSummary
                    }
                    style={{
                        ...buttonStyle,
                        background:
                            "#16a34a",
                    }}
                >

                    {
                        loadingSummary
                            ? "Generating..."
                            : "Generate AI Summary"
                    }

                </button>

                <button
                    onClick={
                        leaveMeeting
                    }
                    style={{
                        ...buttonStyle,
                        background:
                            "#dc2626",
                    }}
                >
                    Leave Meeting
                </button>

            </div>

            {/* MAIN LAYOUT */}

            <div
                style={{
                    display:
                        "flex",
                    gap: "20px",
                    marginTop:
                        "30px",
                }}
            >

                {/* PARTICIPANTS */}

                <div
                    style={{
                        width:
                            "250px",
                        background:
                            "#1e293b",
                        borderRadius:
                            "20px",
                        padding:
                            "20px",
                        height:
                            "80vh",
                    }}
                >

                    <h2
                        style={{
                            textAlign:
                                "center",
                            marginBottom:
                                "20px",
                        }}
                    >
                        Participants (
                        {
                            participants.length
                        }
                        )
                    </h2>

                    {

                        participants.map(
                            (
                                user,
                                index
                            ) => (

                                <div
                                    key={
                                        index
                                    }
                                    style={{
                                        background:
                                            "#0f172a",
                                        padding:
                                            "12px",
                                        borderRadius:
                                            "10px",
                                        marginBottom:
                                            "10px",
                                    }}
                                >

                                    <p
                                        style={{
                                            margin: 0,
                                            fontWeight:
                                                "bold",
                                        }}
                                    >
                                        {
                                            user.userName
                                        }
                                    </p>

                                </div>

                            )
                        )

                    }

                </div>

                {/* VIDEO GRID */}

                <div
                    style={{
                        flex: 1,
                        display:
                            "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit,minmax(400px,1fr))",
                        gap: "20px",
                    }}
                >

                    {/* MY VIDEO */}

                    <div
                        style={{
                            background:
                                "#1e293b",
                            padding:
                                "15px",
                            borderRadius:
                                "20px",
                        }}
                    >

                        <h2
                            style={{
                                textAlign:
                                    "center",
                            }}
                        >
                            {userName}
                        </h2>

                        <video
                            ref={
                                myVideoRef
                            }
                            autoPlay
                            muted
                            playsInline
                            style={{
                                width:
                                    "100%",
                                borderRadius:
                                    "20px",
                            }}
                        />

                    </div>

                    {/* REMOTE USERS */}

                    {remoteStreams.map(
                        (
                            stream,
                            index
                        ) => (

                            <VideoCard
                                key={
                                    index
                                }
                                stream={
                                    stream
                                }
                            />

                        )
                    )}

                </div>

                {/* RIGHT SIDEBAR */}

                <div
                    style={{
                        width:
                            "350px",
                        background:
                            "#1e293b",
                        borderRadius:
                            "20px",
                        padding:
                            "20px",
                        height:
                            "80vh",
                        display:
                            "flex",
                        flexDirection:
                            "column",
                        overflowY:
                            "auto",
                    }}
                >

                    <h2
                        style={{
                            textAlign:
                                "center",
                        }}
                    >
                        Live Chat
                    </h2>

                    {/* CHAT */}

                    <div
                        style={{
                            flex: 1,
                            overflowY:
                                "auto",
                            marginTop:
                                "20px",
                        }}
                    >

                        {messages.map(
                            (
                                msg,
                                index
                            ) => (

                                <div
                                    key={
                                        index
                                    }
                                    style={{
                                        marginBottom:
                                            "15px",
                                        background:
                                            "#0f172a",
                                        padding:
                                            "10px",
                                        borderRadius:
                                            "10px",
                                    }}
                                >

                                    <strong>
                                        {
                                            msg.userName
                                        }
                                    </strong>

                                    <p>
                                        {
                                            msg.message
                                        }
                                    </p>

                                </div>

                            )
                        )}

                    </div>

                    {/* TRANSCRIPT */}

                    <div
                        style={{
                            marginTop:
                                "20px",
                            background:
                                "#0f172a",
                            padding:
                                "15px",
                            borderRadius:
                                "10px",
                        }}
                    >

                        <h3>
                            Live Transcript
                        </h3>

                        <p
                            style={{
                                fontSize:
                                    "14px",
                                lineHeight:
                                    "1.6",
                            }}
                        >
                            {transcript ||
                                "Listening..."}
                        </p>

                    </div>

                    {/* SUMMARY */}

                    {
                        summary && (

                            <div
                                style={{
                                    marginTop:
                                        "20px",
                                    background:
                                        "#0f172a",
                                    padding:
                                        "15px",
                                    borderRadius:
                                        "10px",
                                }}
                            >

                                <h3>
                                    AI Summary
                                </h3>

                                <p
                                    style={{
                                        whiteSpace:
                                            "pre-wrap",
                                        lineHeight:
                                            "1.7",
                                    }}
                                >
                                    {
                                        summary
                                    }
                                </p>

                            </div>

                        )
                    }

                    {/* INPUT */}

                    <div
                        style={{
                            display:
                                "flex",
                            gap: "10px",
                            marginTop:
                                "15px",
                        }}
                    >

                        <input
                            type="text"
                            placeholder="Type message..."
                            value={
                                messageInput
                            }
                            onChange={(
                                e
                            ) =>
                                setMessageInput(
                                    e
                                        .target
                                        .value
                                )
                            }
                            style={{
                                flex: 1,
                                padding:
                                    "12px",
                                borderRadius:
                                    "10px",
                                border:
                                    "none",
                                outline:
                                    "none",
                            }}
                        />

                        <button
                            onClick={
                                sendMessage
                            }
                            style={{
                                padding:
                                    "12px 18px",
                                border:
                                    "none",
                                borderRadius:
                                    "10px",
                                background:
                                    "#2563eb",
                                color:
                                    "white",
                                cursor:
                                    "pointer",
                            }}
                        >
                            Send
                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}

function VideoCard({ stream }) {

    const videoRef = useRef(null);

    useEffect(() => {

        if (videoRef.current) {

            videoRef.current.srcObject =
                stream;

        }

    }, [stream]);

    return (

        <div
            style={{
                background:
                    "#1e293b",
                padding:
                    "15px",
                borderRadius:
                    "20px",
            }}
        >

            <h2
                style={{
                    textAlign:
                        "center",
                }}
            >
                Participant
            </h2>

            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    width: "100%",
                    borderRadius:
                        "20px",
                }}
            />

        </div>

    );

}

const buttonStyle = {
    padding: "12px 20px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
};

export default Meeting;