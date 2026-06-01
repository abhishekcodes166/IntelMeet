import React, { useState, useEffect } from 'react';
import './RecordingIndicator.css';

export default function RecordingIndicator({ socket, meetingId, userName, userId, isHost }) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingId, setRecordingId] = useState(null);

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const toggleRecording = () => {
        if (!isRecording) {
            setIsRecording(true);
            setRecordingTime(0);
            socket.emit('recording-started', {
                roomId: meetingId,
                userId,
                userName,
            });
        } else {
            setIsRecording(false);
            socket.emit('recording-stopped', {
                roomId: meetingId,
                recordingId,
                userId,
                userName,
            });
            setRecordingId(null);
            setRecordingTime(0);
        }
    };

    useEffect(() => {
        socket.on('recording-started-notification', ({ recordingId: id }) => {
            setRecordingId(id);
        });

        socket.on('recording-stopped-notification', () => {
            setIsRecording(false);
            setRecordingId(null);
        });

        return () => {
            socket.off('recording-started-notification');
            socket.off('recording-stopped-notification');
        };
    }, [socket]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="recording-indicator-container">
            {isRecording && (
                <div className="recording-badge">
                    <span className="recording-dot"></span>
                    Recording {formatTime(recordingTime)}
                </div>
            )}
            
            {isHost && (
                <button
                    onClick={toggleRecording}
                    className={`recording-btn ${isRecording ? 'stop' : 'start'}`}
                >
                    {isRecording ? '⏹️ Stop Recording' : '⚫ Start Recording'}
                </button>
            )}
        </div>
    );
}
