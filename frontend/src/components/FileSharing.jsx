import React, { useState } from 'react';
import './FileSharing.css';

export default function FileSharing({ socket, meetingId, userName, userId }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);

        // In a real app, you'd upload to a storage service (AWS S3, Firebase, etc.)
        // For now, we'll create a mock URL
        const fileUrl = URL.createObjectURL(file);

        socket.emit('file-uploaded', {
            roomId: meetingId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileUrl,
            userId,
            userName,
            timestamp: new Date(),
        });

        setUploading(false);
        event.target.value = '';
    };

    React.useEffect(() => {
        socket.on('file-shared', (fileData) => {
            setFiles(prev => [...prev, fileData]);
        });

        return () => {
            socket.off('file-shared');
        };
    }, [socket]);

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="file-sharing-container">
            <h3>Shared Files</h3>
            
            <div className="file-upload">
                <input
                    type="file"
                    id="file-input"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="file-input"
                />
                <label htmlFor="file-input" className="upload-btn">
                    {uploading ? 'Uploading...' : '📤 Upload File'}
                </label>
            </div>

            <div className="files-list">
                {files.map((file, idx) => (
                    <div key={idx} className="file-item">
                        <span className="file-icon">
                            {file.fileType === 'image' && '🖼️'}
                            {file.fileType === 'document' && '📄'}
                            {file.fileType === 'video' && '🎥'}
                            {file.fileType === 'audio' && '🎵'}
                            {file.fileType === 'other' && '📎'}
                        </span>
                        <div className="file-info">
                            <p className="file-name">{file.fileName}</p>
                            <p className="file-meta">
                                {file.uploadedBy} • {formatFileSize(file.fileSize)}
                            </p>
                        </div>
                        <a href={file.fileUrl} download className="download-btn">
                            ⬇️
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
