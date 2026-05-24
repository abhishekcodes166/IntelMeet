import { useState } from "react";

import { useNavigate } from "react-router-dom";

function Home() {

    const navigate = useNavigate();

    const [userName, setUserName] =
        useState("");

    const [meetingCode, setMeetingCode] =
        useState("");

    // CREATE MEETING
    const createMeeting = () => {

        if (!userName.trim()) {

            alert(
                "Please enter your name"
            );

            return;

        }

        const roomId =
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

        navigate(
            `/meeting/${roomId}?name=${userName}`
        );

    };

    // JOIN MEETING
    const joinMeeting = () => {

        if (
            !meetingCode.trim() ||
            !userName.trim()
        ) {

            alert(
                "Enter name and meeting code"
            );

            return;

        }

        navigate(
            `/meeting/${meetingCode}?name=${userName}`
        );

    };

    return (

        <div
            style={{
                minHeight: "100vh",
                background: "#0f172a",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
            }}
        >

            <div
                style={{
                    background: "#1e293b",
                    padding: "40px",
                    borderRadius: "20px",
                    width: "400px",
                    textAlign: "center",
                }}
            >

                <h1>
                    AI Meet
                </h1>

                <input
                    type="text"
                    placeholder="Enter Your Name"
                    value={userName}
                    onChange={(e) =>
                        setUserName(
                            e.target.value
                        )
                    }
                    style={inputStyle}
                />

                <button
                    onClick={
                        createMeeting
                    }
                    style={
                        buttonStyle
                    }
                >
                    Create Meeting
                </button>

                <hr
                    style={{
                        margin:
                            "25px 0",
                    }}
                />

                <input
                    type="text"
                    placeholder="Enter Meeting Code"
                    value={meetingCode}
                    onChange={(e) =>
                        setMeetingCode(
                            e.target.value
                        )
                    }
                    style={inputStyle}
                />

                <button
                    onClick={
                        joinMeeting
                    }
                    style={
                        buttonStyle
                    }
                >
                    Join Meeting
                </button>

            </div>

        </div>

    );

}

const inputStyle = {
    width: "100%",
    padding: "14px",
    marginTop: "15px",
    borderRadius: "10px",
    border: "none",
    outline: "none",
    fontSize: "16px",
    boxSizing: "border-box",
};

const buttonStyle = {
    width: "100%",
    padding: "14px",
    marginTop: "15px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
};

export default Home;