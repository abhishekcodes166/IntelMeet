import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

export default function NotificationCenter({ socket, userId }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        // Join user-specific room for notifications
        socket.emit('join-user-notifications', { userId });

        socket.on('notification-received', (notification) => {
            setNotifications(prev => [{
                ...notification,
                id: Date.now(),
                isRead: false,
                timestamp: new Date(),
            }, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                dismissNotification(notification.id);
            }, 5000);
        });

        return () => {
            socket.off('notification-received');
        };
    }, [socket, userId]);

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <div className="notification-center">
            <button
                className="notification-bell"
                onClick={() => setShowNotifications(!showNotifications)}
            >
                🔔
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>

            {showNotifications && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <button
                            onClick={() => setShowNotifications(false)}
                            className="close-btn"
                        >
                            ✕
                        </button>
                    </div>

                    {notifications.length > 0 ? (
                        <ul className="notifications-list">
                            {notifications.map(notif => (
                                <li
                                    key={notif.id}
                                    className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                                >
                                    <div className="notification-content">
                                        <p className="notification-title">{notif.title}</p>
                                        <p className="notification-message">{notif.message}</p>
                                        <p className="notification-sender">
                                            {notif.sender && `From: ${notif.sender}`}
                                        </p>
                                    </div>
                                    {!notif.isRead && (
                                        <button
                                            onClick={() => markAsRead(notif.id)}
                                            className="mark-read-btn"
                                        >
                                            ✓
                                        </button>
                                    )}
                                    <button
                                        onClick={() => dismissNotification(notif.id)}
                                        className="dismiss-btn"
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="no-notifications">No notifications</p>
                    )}
                </div>
            )}

            {/* Floating notifications */}
            <div className="floating-notifications">
                {notifications.filter(n => !showNotifications).map(notif => (
                    <div key={notif.id} className="floating-notification">
                        <p className="float-title">{notif.title}</p>
                        <p className="float-message">{notif.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
