import React, { useRef, useEffect, useState } from 'react';
import './Whiteboard.css';

export default function Whiteboard({ meetingId, socket, userName }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setContext(ctx);
        }

        // Listen for whiteboard updates from other users
        if (socket) {
            socket.on('whiteboard-update', ({ content, updatedBy }) => {
                if (context && content) {
                    redrawWhiteboard(content);
                }
            });

            socket.on('whiteboard-cleared', () => {
                clearCanvas();
            });
        }

        return () => {
            if (socket) {
                socket.off('whiteboard-update');
                socket.off('whiteboard-cleared');
            }
        };
    }, [socket, context]);

    const startDrawing = (e) => {
        setIsDrawing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        context.beginPath();
        context.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e) => {
        if (!isDrawing || !context) return;

        const rect = canvasRef.current.getBoundingClientRect();
        context.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        context.stroke();

        // Emit drawing to other users in real-time
        if (socket) {
            const imageData = canvasRef.current.toDataURL();
            socket.emit('whiteboard-draw', {
                roomId: meetingId,
                userId: localStorage.getItem('userId'),
                userName,
                content: imageData,
            });
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        context.closePath();
    };

    const clearCanvas = () => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (socket) {
            socket.emit('whiteboard-clear', {
                roomId: meetingId,
                userId: localStorage.getItem('userId'),
                userName,
            });
        }
    };

    const redrawWhiteboard = (imageData) => {
        const img = new Image();
        img.src = imageData;
        img.onload = () => {
            context.drawImage(img, 0, 0);
        };
    };

    return (
        <div className="whiteboard-container">
            <div className="whiteboard-header">
                <h3>Shared Whiteboard</h3>
                <button onClick={clearCanvas} className="clear-btn">Clear</button>
            </div>
            <canvas
                ref={canvasRef}
                className="whiteboard-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
        </div>
    );
}
