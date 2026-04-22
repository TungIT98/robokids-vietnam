import { useState, useEffect, useRef, useCallback } from 'react';

export type POVConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface UseRobotPOVOptions {
  /** ESP32-CAM server base URL (e.g., http://192.168.1.100) */
  serverUrl?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnect attempts before giving up */
  maxReconnectAttempts?: number;
  /** Reconnect delay in ms */
  reconnectDelayMs?: number;
  /** Target latency in ms (default: 100) */
  targetLatencyMs?: number;
}

export interface UseRobotPOVReturn {
  /** Current connection state */
  connectionState: POVConnectionState;
  /** Error message if any */
  error: string | null;
  /** Remote video stream */
  videoStream: MediaStream | null;
  /** Whether stream is active */
  isStreaming: boolean;
  /** Current measured latency in ms */
  latencyMs: number;
  /** Connect to ESP32-CAM */
  connect: (serverUrl?: string) => Promise<void>;
  /** Disconnect and cleanup */
  disconnect: () => void;
  /** Manually trigger reconnection */
  reconnect: () => void;
}

// Low-latency STUN/TURN server configuration
// Using multiple STUN servers and free TURN options
const ICE_SERVERS: RTCIceServer[] = [
  // Google STUN servers (primary)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Twilio STUN (fallback)
  { urls: 'stun:global.stun.twilio.com:3478' },
  // Free TURN (limited capacity - for testing)
  {
    urls: 'turn:openrelay.community:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// Latency measurement interval
const LATENCY_CHECK_INTERVAL = 2000;

const DEFAULT_RECONNECT_DELAY = 2000;
const DEFAULT_MAX_RECONNECT = 5;

export function useRobotPOV(options: UseRobotPOVOptions = {}): UseRobotPOVReturn {
  const {
    serverUrl: initialServerUrl,
    autoConnect = false,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT,
    reconnectDelayMs = DEFAULT_RECONNECT_DELAY,
    targetLatencyMs = 100,
  } = options;

  const [connectionState, setConnectionState] = useState<POVConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentServerUrlRef = useRef<string | null>(initialServerUrl || null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latencyCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPongRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (latencyCheckIntervalRef.current) {
        clearInterval(latencyCheckIntervalRef.current);
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, []);

  // Start latency measurement using a data channel
  const startLatencyMeasurement = useCallback((pc: RTCPeerConnection) => {
    // Create a reliable data channel for latency pings
    const dataChannel = pc.createDataChannel('latency', {
      ordered: false, // Disable ordering for lower latency
    });

    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('[POV] Latency channel opened');
    };

    dataChannel.onmessage = (event) => {
      const now = performance.now();
      const pingTime = parseFloat(event.data);
      if (!isNaN(pingTime)) {
        const latency = now - pingTime;
        setLatencyMs(Math.round(latency));
      }
    };

    dataChannel.onclose = () => {
      console.log('[POV] Latency channel closed');
    };

    // Also set up a fallback: assume data channel doesn't work with ESP32
    // Start interval-based latency check via timestamp comparison on video frames
    latencyCheckIntervalRef.current = setInterval(() => {
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        // Send ping with timestamp
        dataChannelRef.current.send(performance.now().toString());
      }
    }, LATENCY_CHECK_INTERVAL);

    // Return cleanup
    return () => {
      if (latencyCheckIntervalRef.current) {
        clearInterval(latencyCheckIntervalRef.current);
        latencyCheckIntervalRef.current = null;
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
    };
  }, []);

  // Handle remote data channel (for servers that initiate)
  const handleDataChannel = useCallback((event: RTCDataChannelEvent) => {
    const channel = event.channel;
    channel.onmessage = (ev) => {
      const now = performance.now();
      const pingTime = parseFloat(ev.data);
      if (!isNaN(pingTime)) {
        setLatencyMs(Math.round(now - pingTime));
      }
    };
    dataChannelRef.current = channel;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }

    setVideoStream(null);
    setIsStreaming(false);
    setConnectionState('disconnected');
    setError(null);
  }, [videoStream]);

  const handleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionState('error');
      setError('Max reconnection attempts reached. Please check the camera connection.');
      return;
    }

    if (!currentServerUrlRef.current) return;

    setConnectionState('reconnecting');
    reconnectAttemptsRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      connect(currentServerUrlRef.current!);
    }, reconnectDelayMs);
  }, [maxReconnectAttempts, reconnectDelayMs]);

  const connect = useCallback(async (serverUrl?: string) => {
    const targetUrl = serverUrl || currentServerUrlRef.current;
    if (!targetUrl) {
      setError('No server URL provided');
      setConnectionState('error');
      return;
    }

    currentServerUrlRef.current = targetUrl;
    reconnectAttemptsRef.current = 0;

    // Cleanup any existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      // Create peer connection with optimized ICE servers for low latency
      // - Prioritize STUN for direct connections (lowest latency)
      // - TURN as fallback for NAT traversal
      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        // Optimize for low latency over quality
        iceCandidatePoolSize: 10, // Pre-gather candidates for faster connection
        // Bundle audio/video/data on single transport
        bundlePolicy: 'max-bundle',
      });

      peerConnectionRef.current = pc;

      // Handle data channel from remote peer (for latency measurement)
      pc.ondatachannel = handleDataChannel;

      // Handle incoming video track
      pc.ontrack = (event) => {
        if (!isMountedRef.current) return;
        const [stream] = event.streams;
        if (stream) {
          setVideoStream(stream);
          setIsStreaming(true);
          setConnectionState('connected');
          // Start latency measurement after video track is received
          startLatencyMeasurement(pc);
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        switch (pc.iceConnectionState) {
          case 'connected':
          case 'completed':
            setConnectionState('connected');
            setIsStreaming(true);
            reconnectAttemptsRef.current = 0;
            break;
          case 'disconnected':
            handleReconnect();
            break;
          case 'failed':
            handleReconnect();
            break;
          case 'closed':
            setConnectionState('disconnected');
            break;
        }
      };

      pc.onicegatheringstatechange = () => {
        if (!isMountedRef.current) return;
        if (pc.iceGatheringState === 'gathering') {
          // Still gathering candidates
        }
      };

      // Create offer SDP
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      // Send offer to ESP32-CAM and get answer
      // The ESP32-CAM with WebRTC firmware typically has an HTTP endpoint
      // that accepts SDP offer and returns SDP answer
      const response = await fetch(`${targetUrl}/sdpoffer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!response.ok) {
        // Fallback: try alternative endpoint
        const altResponse = await fetch(`${targetUrl}/webrtc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });

        if (!altResponse.ok) {
          throw new Error(`Camera rejected connection: ${altResponse.status}`);
        }

        const answerSdp = await altResponse.text();
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp,
        }));
      } else {
        const answerSdp = await response.text();
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp,
        }));
      }

    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to camera';
      setError(errorMessage);
      setConnectionState('error');
      setIsStreaming(false);
    }
  }, [handleReconnect]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (currentServerUrlRef.current) {
      disconnect();
      connect(currentServerUrlRef.current);
    }
  }, [connect, disconnect]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && initialServerUrl) {
      connect(initialServerUrl);
    }
  }, [autoConnect, initialServerUrl, connect]);

  return {
    connectionState,
    error,
    videoStream,
    isStreaming,
    latencyMs,
    connect,
    disconnect,
    reconnect,
  };
}