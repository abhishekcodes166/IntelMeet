import React, { useState, useEffect } from 'react';
import './SpeakingIndicator.css';

export default function SpeakingIndicator({ socket, meetingId }) {
    const [speakingUsers, setSpeakingUsers] = useState([]);

    useEffect(() => {
        socket.on('speaking-status-updated', ({ userId, userName, isSpeaking }) => {
            setSpeakingUsers(prev => {
                if (isSpeaking) {
                    // Add or update speaking user
                    const exists = prev.some(u => u.userId === userId);
                    if (!exists) {
                        return [...prev, { userId, userName, isSpeaking }];
                    }
                    return prev;
                } else {
                    // Remove from speaking users
                    return prev.filter(u => u.userId !== userId);
                }
            });
        });

        socket.on('user-speaking-status', ({ socketId, userName, isSpeaking }) => {
            setSpeakingUsers(prev => {
                if (isSpeaking) {
                    const exists = prev.some(u => u.userName === userName);
                    if (!exists) {
                        return [...prev, { socketId, userName, isSpeaking }];
                    }
                    return prev;
                } else {
                    return prev.filter(u => u.userName !== userName);
                }
            });
        });

        return () => {
            socket.off('speaking-status-updated');
            socket.off('user-speaking-status');
        };
    }, [socket]);

    return (
        <div className="speaking-indicator-container">
            <h4>Now Speaking</h4>
            {speakingUsers.length > 0 ? (
                <ul className="speaking-users-list">
                    {speakingUsers.map((user, idx) => (
                        <li key={idx} className="speaking-user">
                            <span className="speaking-dot"></span>
                            <span className="speaking-name">{user.userName}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="no-speakers">No one speaking</p>
            )}
        </div>
    );
}
