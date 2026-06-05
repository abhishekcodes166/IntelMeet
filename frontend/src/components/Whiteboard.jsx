import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import './Whiteboard.css';

export default function Whiteboard({ meetingId, socket, userName }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const previousDrawing = canvas.width && canvas.height ? canvas.toDataURL() : null;
        const context = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        contextRef.current = context;

        if (previousDrawing) {
            const img = new Image();
            img.src = previousDrawing;
            img.onload = () => {
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, []);

    const clearCanvas = useCallback((broadcast = true) => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (broadcast && socket) {
            socket.emit('whiteboard-clear', {
                roomId: meetingId,
                userId: localStorage.getItem('userId'),
                userName,
            });
        }
    }, [meetingId, socket, userName]);

    const redrawWhiteboard = useCallback((imageData) => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context || !imageData) return;

        const img = new Image();
        img.src = imageData;
        img.onload = () => {
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
    }, []);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [resizeCanvas]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
            requestAnimationFrame(resizeCanvas);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [resizeCanvas]);

    useEffect(() => {
        if (!socket) return undefined;

        const handleWhiteboardUpdate = ({ content }) => {
            redrawWhiteboard(content);
        };
        const handleWhiteboardCleared = () => {
            clearCanvas(false);
        };

        socket.on('whiteboard-update', handleWhiteboardUpdate);
        socket.on('whiteboard-cleared', handleWhiteboardCleared);

        return () => {
            socket.off('whiteboard-update', handleWhiteboardUpdate);
            socket.off('whiteboard-cleared', handleWhiteboardCleared);
        };
    }, [clearCanvas, redrawWhiteboard, socket]);

    const toggleFullscreen = async () => {
        const container = containerRef.current;
        if (!container) return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await container.requestFullscreen();
        }
    };

    const startDrawing = (e) => {
        const context = contextRef.current;
        if (!context) return;

        setIsDrawing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        context.beginPath();
        context.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e) => {
        const context = contextRef.current;
        if (!isDrawing || !context) return;

        const rect = canvasRef.current.getBoundingClientRect();
        context.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        context.stroke();

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
        const context = contextRef.current;
        if (!context) return;

        setIsDrawing(false);
        context.closePath();
    };

    return (
        <div className="whiteboard-container" ref={containerRef}>
            <div className="whiteboard-header">
                <h3>Shared Whiteboard</h3>
                <div className="whiteboard-actions">
                    <button onClick={() => clearCanvas()} className="clear-btn">Clear</button>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="fullscreen-btn"
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
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
