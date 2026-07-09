import React, { useState } from 'react';
import api from '../lib/api';
import './FileSharing.css';

export default function FileSharing({ socket, meetingId, userName, userId }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Fetch existing files on mount
    React.useEffect(() => {
        const fetchFiles = async () => {
            try {
                const res = await api.get(`/files/${meetingId}`);
                if (res.data.success) {
                    const loadedFiles = (res.data.files || []).map(f => ({
                        fileId: f._id,
                        fileName: f.fileName,
                        fileUrl: f.fileUrl,
                        fileType: f.fileType,
                        uploadedBy: f.uploadedByName || (f.uploadedBy && f.uploadedBy.fullName) || 'Unknown',
                        fileSize: f.fileSize,
                        timestamp: f.createdAt
                    }));
                    setFiles(loadedFiles);
                }
            } catch (err) {
                console.error("Error fetching files:", err);
            }
        };
        if (meetingId) {
            fetchFiles();
        }
    }, [meetingId]);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/files/upload-raw', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                const { fileUrl, fileName, fileSize, mimeType } = res.data;

                // Emit socket event to notify other meeting participants in real-time
                socket.emit('file-uploaded', {
                    roomId: meetingId,
                    fileName,
                    fileSize,
                    mimeType,
                    fileUrl,
                    userId,
                    userName,
                    timestamp: new Date(),
                });
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert(err.response?.data?.message || "Failed to upload file to Cloudinary");
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    React.useEffect(() => {
        socket.on('file-shared', (fileData) => {
            setFiles(prev => [fileData, ...prev]);
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
                    <div key={file.fileId || idx} className="file-item">
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
                        <a 
                            href={file.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download 
                            className="download-btn"
                            title="Download file"
                        >
                            ⬇️
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
