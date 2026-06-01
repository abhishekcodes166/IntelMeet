import React, { useState, useEffect } from 'react';
import './ScheduledMeetings.css';

export default function ScheduledMeetings({ api }) {
    const [meetings, setMeetings] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        attendeeEmails: [],
        scheduledStartTime: '',
        scheduledEndTime: '',
        timeZone: 'UTC',
    });

    const fetchScheduledMeetings = async () => {
        try {
            const response = await api.get('/api/v1/scheduled-meetings/');
            setMeetings(response.data.meetings);
        } catch (error) {
            console.error('Failed to fetch scheduled meetings:', error);
        }
    };

    useEffect(() => {
        fetchScheduledMeetings();
    }, [api]);

    const handleScheduleMeeting = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/v1/scheduled-meetings/schedule', formData);
            setMeetings(prev => [...prev, response.data.meeting]);
            setFormData({
                title: '',
                description: '',
                attendeeEmails: [],
                scheduledStartTime: '',
                scheduledEndTime: '',
                timeZone: 'UTC',
            });
            setShowForm(false);
        } catch (error) {
            console.error('Failed to schedule meeting:', error);
        }
    };

    const handleRsvp = async (meetingId, status) => {
        try {
            await api.put('/api/v1/scheduled-meetings/rsvp', {
                meetingId,
                status,
            });
            fetchScheduledMeetings();
        } catch (error) {
            console.error('Failed to update RSVP:', error);
        }
    };

    const cancelMeeting = async (meetingId) => {
        try {
            await api.delete(`/api/v1/scheduled-meetings/${meetingId}`);
            setMeetings(prev => prev.filter(m => m._id !== meetingId));
        } catch (error) {
            console.error('Failed to cancel meeting:', error);
        }
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="scheduled-meetings-container">
            <h2>Scheduled Meetings</h2>

            <button
                onClick={() => setShowForm(!showForm)}
                className="schedule-btn"
            >
                {showForm ? 'Cancel' : '📅 Schedule Meeting'}
            </button>

            {showForm && (
                <form onSubmit={handleScheduleMeeting} className="schedule-form">
                    <input
                        type="text"
                        placeholder="Meeting Title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                    />
                    
                    <textarea
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                    
                    <input
                        type="email"
                        placeholder="Add attendee email"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                                setFormData({
                                    ...formData,
                                    attendeeEmails: [...formData.attendeeEmails, e.target.value]
                                });
                                e.target.value = '';
                            }
                        }}
                    />
                    
                    <div className="attendees-list">
                        {formData.attendeeEmails.map((email, idx) => (
                            <span key={idx} className="attendee-tag">
                                {email}
                                <button
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        attendeeEmails: formData.attendeeEmails.filter((_, i) => i !== idx)
                                    })}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>
                    
                    <input
                        type="datetime-local"
                        value={formData.scheduledStartTime}
                        onChange={(e) => setFormData({...formData, scheduledStartTime: e.target.value})}
                        required
                    />
                    
                    <input
                        type="datetime-local"
                        value={formData.scheduledEndTime}
                        onChange={(e) => setFormData({...formData, scheduledEndTime: e.target.value})}
                        required
                    />
                    
                    <select
                        value={formData.timeZone}
                        onChange={(e) => setFormData({...formData, timeZone: e.target.value})}
                    >
                        <option>UTC</option>
                        <option>EST</option>
                        <option>CST</option>
                        <option>MST</option>
                        <option>PST</option>
                        <option>IST</option>
                    </select>
                    
                    <button type="submit" className="submit-btn">Schedule Meeting</button>
                </form>
            )}

            <div className="meetings-grid">
                {meetings.map(meeting => (
                    <div key={meeting._id} className="meeting-card">
                        <h3>{meeting.title}</h3>
                        <p>{meeting.description}</p>
                        <p className="meeting-time">
                            🕐 {formatDateTime(meeting.scheduledStartTime)}
                        </p>
                        <p className="meeting-zone">🌍 {meeting.timeZone}</p>
                        
                        <div className="attendees-info">
                            <strong>Attendees:</strong>
                            <ul>
                                {meeting.attendees.map((att, idx) => (
                                    <li key={idx}>
                                        {att.email} - {att.status}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {meeting.status === 'scheduled' && (
                            <div className="meeting-actions">
                                <button
                                    onClick={() => handleRsvp(meeting._id, 'accepted')}
                                    className="accept-btn"
                                >
                                    ✓ Accept
                                </button>
                                <button
                                    onClick={() => handleRsvp(meeting._id, 'declined')}
                                    className="decline-btn"
                                >
                                    ✕ Decline
                                </button>
                                {localStorage.getItem('userId') === meeting.host._id && (
                                    <button
                                        onClick={() => cancelMeeting(meeting._id)}
                                        className="cancel-btn"
                                    >
                                        Cancel Meeting
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
