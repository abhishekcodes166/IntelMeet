import React, { useState, useEffect } from 'react';
import './Reactions.css';

export default function Reactions({ socket, meetingId }) {
    const [reactions, setReactions] = useState([]);
    const [selectedEmoji, setSelectedEmoji] = useState('👍');

    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

    const sendReaction = (emoji) => {
        socket.emit('send-reaction', {
            roomId: meetingId,
            emoji,
            userId: localStorage.getItem('userId'),
            userName: localStorage.getItem('userName'),
        });
    };

    useEffect(() => {
        socket.on('reaction-received', (reaction) => {
            const id = `${Date.now()}-${Math.random()}`;
            setReactions(prev => [...prev, { ...reaction, id }]);
            
            // Remove reaction after 3 seconds
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== id));
            }, 3000);
        });

        return () => {
            socket.off('reaction-received');
        };
    }, [socket]);

    return (
        <div className="reactions-container">
            <div className="reactions-display">
                {reactions.map(reaction => (
                    <div
                        key={reaction.id}
                        className="floating-reaction"
                        style={{
                            left: `${reaction.x}%`,
                            top: `${reaction.y}%`,
                            animation: 'float-up 3s ease-out forwards',
                        }}
                    >
                        <span className="reaction-emoji">{reaction.emoji}</span>
                        <p className="reaction-name">{reaction.userName}</p>
                    </div>
                ))}
            </div>

            <div className="reactions-buttons">
                {emojis.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="reaction-btn"
                        title={emoji}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
