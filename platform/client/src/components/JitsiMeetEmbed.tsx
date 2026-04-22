/**
 * JitsiMeetEmbed - Embedded Jitsi Meet video for live classes
 * Free, no account needed, supports up to 75 participants
 */

import { useEffect, useRef } from 'react';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName: string;
  width?: number | string;
  height?: number | string;
  onConferenceJoined?: () => void;
  onConferenceLeft?: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (
      domain: string,
      options: {
        roomName: string;
        width?: number | string;
        height?: number | string;
        parentNode?: HTMLElement | null;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => { dispose: () => void };
  }
}

export default function JitsiMeetEmbed({
  roomName,
  displayName,
  width = '100%',
  height = 500,
  onConferenceJoined,
  onConferenceLeft,
}: JitsiMeetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    // Load Jitsi script
    const loadJitsi = () => {
      if (document.getElementById('jitsi-api-script')) {
        initJitsi();
        return;
      }

      const script = document.createElement('script');
      script.id = 'jitsi-api-script';
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => initJitsi();
      document.head.appendChild(script);
    };

    const initJitsi = () => {
      if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

      // Clean up any existing instance
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }

      try {
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName,
          width: width,
          height: height,
          parentNode: containerRef.current,
          userInfo: {
            displayName: displayName,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'chat',
              'raisehand',
              'videoquality',
              'tileview',
              'hangup',
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#1a1a2e',
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          },
        };

        // Jitsi API has more methods than just dispose - cast to any for event listener support
        const jitsiApi = new window.JitsiMeetExternalAPI(domain, options) as any;
        apiRef.current = jitsiApi;

        // Add event listeners
        if (onConferenceJoined && jitsiApi.addEventListener) {
          jitsiApi.addEventListener('videoConferenceJoined', onConferenceJoined);
        }
        if (onConferenceLeft && jitsiApi.addEventListener) {
          jitsiApi.addEventListener('videoConferenceLeft', onConferenceLeft);
        }
      } catch (error) {
        console.error('Failed to initialize Jitsi:', error);
      }
    };

    loadJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, width, height, onConferenceJoined, onConferenceLeft]);

  return (
    <div style={styles.container}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
};