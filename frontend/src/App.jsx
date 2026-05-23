import { useEffect, useState } from "react";
import socket from "./socket";

function App() {

    const [participants, setParticipants] = useState([]);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");

    const meetingCode = "5NDIV5";
    const userName = "Abhishek";

    useEffect(() => {

        socket.on("connect", () => {
            console.log("Connected");
        });

        // Join meeting
        socket.emit("join-meeting", {
            meetingCode,
            userName,
        });

        // Participants
        socket.on("meeting-participants", (data) => {
            setParticipants(data);
        });

        // Chat messages
        socket.on("receive-message", (data) => {

            setMessages((prev) => [...prev, data]);

        });

        return () => {

            socket.off("meeting-participants");
            socket.off("receive-message");

        };

    }, []);

    // Send message
    const sendMessage = () => {

        if (!messageInput.trim()) return;

        socket.emit("send-message", {
            meetingCode,
            userName,
            message: messageInput,
        });

        setMessageInput("");

    };

    return (
        <div style={{ padding: "20px" }}>

            <h1>AI Meet</h1>

            <h2>Participants</h2>

            {
                participants.map((participant) => (
                    <p key={participant.socketId}>
                        {participant.userName}
                    </p>
                ))
            }

            <hr />

            <h2>Chat</h2>

            <div>

                {
                    messages.map((msg, index) => (
                        <p key={index}>
                            <strong>{msg.userName}:</strong> {msg.message}
                        </p>
                    ))
                }

            </div>

            <input
                type="text"
                placeholder="Enter message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
            />

            <button onClick={sendMessage}>
                Send
            </button>

        </div>
    );
}

export default App;