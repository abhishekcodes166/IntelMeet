import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import "./App.css";

function App() {

    const [remoteStreams, setRemoteStreams] = useState([]);

    const myVideo = useRef();

    const peerInstance = useRef(null);

    useEffect(() => {

        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: true,
            })
            .then((stream) => {

                // MY VIDEO
                myVideo.current.srcObject = stream;

                // CREATE PEER
                const peer = new Peer();

                peerInstance.current = peer;

                peer.on("open", (id) => {

                    console.log("My Peer ID:", id);

                    const otherPeerId = prompt(
                        "Enter other peer ID:"
                    );

                    // CALL OTHER USER
                    if (otherPeerId) {

                        const call = peer.call(
                            otherPeerId,
                            stream
                        );

                        call.on("stream", (remoteStream) => {

                            setRemoteStreams((prev) => [
                                ...prev,
                                remoteStream,
                            ]);

                        });
                    }
                });

                // RECEIVE CALL
                peer.on("call", (call) => {

                    call.answer(stream);

                    call.on("stream", (remoteStream) => {

                        setRemoteStreams((prev) => [
                            ...prev,
                            remoteStream,
                        ]);

                    });
                });
            });

    }, []);

    return (

        <div className="app">

            <h1>AI Meet</h1>

            <div className="video-grid">

                {/* MY VIDEO */}
                <div className="video-card">

                    <h3>My Video</h3>

                    <video
                        ref={myVideo}
                        autoPlay
                        playsInline
                        muted
                    />

                </div>

                {/* REMOTE VIDEOS */}
                {
                    remoteStreams.map((stream, index) => (

                        <Video
                            key={index}
                            stream={stream}
                        />

                    ))
                }

            </div>

        </div>
    );
}

function Video({ stream }) {

    const videoRef = useRef();

    useEffect(() => {

        videoRef.current.srcObject = stream;

    }, [stream]);

    return (

        <div className="video-card">

            <h3>Participant</h3>

            <video
                ref={videoRef}
                autoPlay
                playsInline
            />

        </div>
    );
}

export default App;