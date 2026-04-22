import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type POVConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface RobotPOVOverlayProps {
  /** Video stream from useRobotPOV */
  videoStream: MediaStream | null;
  /** Connection state */
  connectionState: POVConnectionState;
  /** Error message if any */
  error?: string | null;
  /** Callback to reconnect */
  onReconnect?: () => void;
  /** Current latency in ms */
  latencyMs?: number;
  /** Target latency in ms (for color coding) */
  targetLatencyMs?: number;
  /** Initial position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Initial size: 'small' | 'medium' | 'large' */
  size?: 'small' | 'medium' | 'large';
  /** Whether overlay is minimized */
  minimized?: boolean;
  /** Toggle minimized state */
  onToggleMinimize?: () => void;
}

const SIZE_CONFIG = {
  small: { width: 120, height: 90 },
  medium: { width: 200, height: 150 },
  large: { width: 320, height: 240 },
};

const POSITION_CONFIG = {
  'top-left': { top: 16, left: 16 },
  'top-right': { top: 16, right: 16 },
  'bottom-left': { bottom: 180, left: 16 },
  'bottom-right': { bottom: 180, right: 16 },
};

export default function RobotPOVOverlay({
  videoStream,
  connectionState,
  error,
  onReconnect,
  latencyMs = 0,
  targetLatencyMs = 100,
  position = 'bottom-left',
  size = 'medium',
  minimized = false,
  onToggleMinimize,
}: RobotPOVOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Picture-in-Picture support
  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPMode(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiPMode(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  // State-based styling
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return '#22c55e';
      case 'connecting':
      case 'reconnecting': return '#eab308';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return '📹 LIVE';
      case 'connecting': return '⏳ Kết nối...';
      case 'reconnecting': return '🔄 Kết nối lại...';
      case 'error': return '❌ Lỗi kết nối';
      default: return '○ Tắt';
    }
  };

  const dimensions = SIZE_CONFIG[size];
  const positionStyles = POSITION_CONFIG[currentPosition];

  // Don't render if minimized and not hovering
  if (minimized && !showControls) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute z-30"
        style={{
          ...positionStyles,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.7)',
          border: `2px solid ${getStatusColor()}`,
          boxShadow: `0 0 12px ${getStatusColor()}40`,
        }}
        onClick={onToggleMinimize}
      >
        <div className="flex items-center justify-center h-full">
          <span className="text-xl">📹</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-30 rounded-xl overflow-hidden"
      style={{
        ...positionStyles,
        width: dimensions.width,
        height: dimensions.height + 32, // Extra for controls bar
        background: 'rgba(0,0,0,0.8)',
        border: `1px solid ${getStatusColor()}60`,
        boxShadow: `0 0 20px ${getStatusColor()}30`,
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Status bar */}
      <div
        className="flex items-center justify-between px-2 py-1 text-xs"
        style={{ backgroundColor: `${getStatusColor()}20` }}
      >
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span style={{ color: getStatusColor() }} className="font-bold">
            {getStatusText()}
          </span>
          {connectionState === 'connected' && latencyMs > 0 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                backgroundColor: latencyMs <= targetLatencyMs
                  ? 'rgba(34, 197, 94, 0.3)' // Green for good latency
                  : latencyMs <= targetLatencyMs * 1.5
                    ? 'rgba(234, 179, 8, 0.3)' // Yellow for acceptable
                    : 'rgba(239, 68, 68, 0.3)', // Red for high latency
                color: latencyMs <= targetLatencyMs
                  ? '#22c55e'
                  : latencyMs <= targetLatencyMs * 1.5
                    ? '#eab308'
                    : '#ef4444',
              }}
              title={`Độ trễ: ${latencyMs}ms (mục tiêu: <${targetLatencyMs}ms)`}
            >
              {latencyMs}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="text-gray-400 hover:text-white text-xs px-1"
            >
              −
            </button>
          )}
          <button
            onClick={togglePiP}
            className="text-gray-400 hover:text-white text-xs px-1"
            title="Picture-in-Picture"
          >
            ⧉
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="relative" style={{ height: dimensions.height }}>
        {connectionState === 'connected' && videoStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            // Low-latency optimizations:
            // - disablePictureInPicture: prevent OS-level PiP that adds latency
            // - style: CSS transforms don't add latency
            // - preload="auto": start buffering immediately on mount
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror for robot POV
            // Hint to browser for low-latency playback
            disablePictureInPicture
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            {connectionState === 'connecting' || connectionState === 'reconnecting' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${getStatusColor()}`, borderTopColor: 'transparent' }}
                />
                <span className="text-gray-400 text-xs">
                  {connectionState === 'reconnecting' ? 'Đang kết nối lại...' : 'Đang kết nối...'}
                </span>
              </div>
            ) : connectionState === 'error' ? (
              <div className="flex flex-col items-center gap-2 p-2">
                <span className="text-red-400 text-xs text-center">{error || 'Lỗi kết nối'}</span>
                {onReconnect && (
                  <button
                    onClick={onReconnect}
                    className="px-3 py-1 bg-red-600/50 hover:bg-red-500/50 rounded text-white text-xs"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            ) : (
              <span className="text-gray-500 text-xs">Chưa kết nối camera</span>
            )}
          </div>
        )}

        {/* Corner indicators */}
        {connectionState === 'connected' && (
          <>
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-400 rounded-sm" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400 rounded-sm" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-400 rounded-sm" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-400 rounded-sm" />
          </>
        )}
      </div>

      {/* Controls bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-2 px-2 py-1 bg-black/60"
          >
            <button
              onClick={togglePiP}
              className="text-gray-300 hover:text-white text-xs px-2 py-1 bg-gray-700/50 rounded"
            >
              {isPiPMode ? '⧉ Exit PiP' : '⧉ PiP'}
            </button>
            {onReconnect && (
              <button
                onClick={onReconnect}
                className="text-gray-300 hover:text-white text-xs px-2 py-1 bg-gray-700/50 rounded"
              >
                🔄 Kết nối lại
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}