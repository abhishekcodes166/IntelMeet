import React, { useState } from 'react';
import './Whiteboard.css';

export default function PollComponent({ socket, meetingId, userName, userId }) {
    const [polls, setPolls] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    const createPoll = () => {
        if (question.trim() && options.every(o => o.trim())) {
            socket.emit('create-poll', {
                roomId: meetingId,
                question,
                options: options.filter(o => o.trim()),
                userId,
                userName,
            });
            
            setQuestion('');
            setOptions(['', '']);
            setShowCreateForm(false);
        }
    };

    const votePoll = (pollId, optionId) => {
        socket.emit('vote-poll', {
            roomId: meetingId,
            pollId,
            optionId,
            userId,
            userName,
        });
    };

    const closePoll = (pollId) => {
        socket.emit('close-poll', {
            roomId: meetingId,
            pollId,
        });
    };

    React.useEffect(() => {
        socket.on('poll-created', (poll) => {
            setPolls(prev => [...prev, poll]);
        });

        socket.on('poll-updated', ({ pollId, options, totalVotes }) => {
            setPolls(prev => prev.map(p => 
                p.pollId === pollId ? { ...p, options, totalVotes } : p
            ));
        });

        socket.on('poll-closed', ({ pollId, finalResults }) => {
            setPolls(prev => prev.map(p => 
                p.pollId === pollId ? { ...p, closed: true, options: finalResults } : p
            ));
        });

        return () => {
            socket.off('poll-created');
            socket.off('poll-updated');
            socket.off('poll-closed');
        };
    }, [socket]);

    return (
        <div className="poll-container">
            <h3>Quick Polls</h3>
            
            <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="create-poll-btn"
            >
                {showCreateForm ? 'Cancel' : 'Create Poll'}
            </button>

            {showCreateForm && (
                <div className="create-poll-form">
                    <input
                        type="text"
                        placeholder="Poll question..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="poll-input"
                    />
                    
                    {options.map((opt, idx) => (
                        <input
                            key={idx}
                            type="text"
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                                const newOptions = [...options];
                                newOptions[idx] = e.target.value;
                                setOptions(newOptions);
                            }}
                            className="poll-input"
                        />
                    ))}

                    <button 
                        onClick={() => setOptions([...options, ''])}
                        className="add-option-btn"
                    >
                        + Add Option
                    </button>

                    <button 
                        onClick={createPoll}
                        className="submit-poll-btn"
                    >
                        Create Poll
                    </button>
                </div>
            )}

            <div className="polls-list">
                {polls.map(poll => (
                    <div key={poll.pollId} className="poll-item">
                        <h4>{poll.question}</h4>
                        <p className="poll-meta">By: {poll.createdBy} • Votes: {poll.totalVotes}</p>
                        
                        {poll.options.map(option => (
                            <div key={option._id} className="poll-option">
                                <button
                                    onClick={() => votePoll(poll.pollId, option._id)}
                                    className="vote-btn"
                                >
                                    {option.text}
                                </button>
                                <div className="vote-progress">
                                    <div 
                                        className="progress-bar"
                                        style={{
                                            width: `${poll.totalVotes > 0 ? (option.voteCount / poll.totalVotes) * 100 : 0}%`
                                        }}
                                    />
                                    <span className="vote-count">{option.voteCount}</span>
                                </div>
                            </div>
                        ))}
                        
                        {!poll.closed && (
                            <button 
                                onClick={() => closePoll(poll.pollId)}
                                className="close-poll-btn"
                            >
                                Close Poll
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
