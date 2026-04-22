import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Physics } from '@react-three/rapier';
import SpaceRobot from './SpaceRobot';
import SpaceEnvironment from './SpaceEnvironment';
import LoadingIndicator from './LoadingIndicator';
import HardwareGarage from '../HardwareGarage';
import LightSensorRaycaster, { LightDirection, calculateLightLevel } from './LightSensorRaycaster';
import LineTrackerRaycaster, { LinePosition, readLineTracker } from './LineTrackerRaycaster';
import RobotPOVOverlay from './RobotPOVOverlay';
import { useRobotPOV, POVConnectionState } from '../../hooks/useRobotPOV';
import { useSpaceRobotStore, RobotCommand } from '../../stores/spaceRobotStore';
import { reviewSpaceMission } from '../../services/spaceMissionAI';
import { useMultiplayerSession, GamePhase } from '../../hooks/useMultiplayerSession';
import ZArm from './ZArm';
import { GRAVITY_PRESETS, CarPhysicsBody } from './SpacePhysics';
import RobotStatePanel from './RobotStatePanel';

interface SpaceAcademySimulatorProps {
  onCommandExecute?: (command: RobotCommand) => void;
}

const COMMAND_LABELS: Record<RobotCommand, string> = {
  move_forward: '⬆️ Tiến lên',
  move_backward: '⬇️ Lùi lại',
  turn_left: '🔄 Quay trái',
  turn_right: '🔄 Quay phải',
  jump: '⬆️ Nhảy',
  dance: '💃 Nhảy danced',
  wave: '👋 Vẫy tay',
  get_distance: '📡 Khoảng cách',
  get_light_level: '💡 Ánh sáng',
  get_camera_light: '📷 Camera sáng',
  line_tracker: '📍 Dò đường',
};

export default function SpaceAcademySimulator({ onCommandExecute }: SpaceAcademySimulatorProps) {
  const {
    position,
    rotation,
    isExecuting,
    currentCommand,
    commandHistory,
    executeCommand,
    readSensor,
    resetRobot,
    missions,
    activeMissionId,
    setActiveMission,
    completeMission,
    score,
    xpEarned,
    awardXP,
    hardwareTemplateId,
    connectedRobotId,
    setCameraLightDirection,
  } = useSpaceRobotStore();

  // Multiplayer session
  const {
    connectionState,
    gamePhase: mpGamePhase,
    opponentState,
    mySessionId,
    countdownTimer,
    winner,
    joinRoom,
    leaveRoom,
    sendInput,
    setReady,
    requestRestart,
  } = useMultiplayerSession();

  const isMultiplayer = connectionState === 'connected';
  const [showCommands, setShowCommands] = useState(true);
  const [showAIHint, setShowAIHint] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [missionResult, setMissionResult] = useState<any>(null);
  const [cameraLightReading, setCameraLightReading] = useState<number | null>(null);
  const [cameraLightDirection, setLocalCameraLightDir] = useState<LightDirection>('FORWARD');
  const [lineTrackerReading, setLineTrackerReading] = useState<LinePosition>('NONE');

  // Robot POV (ESP32-CAM WebRTC) state
  const [showPOV, setShowPOV] = useState(false);
  const [povMinimized, setPovMinimized] = useState(false);
  const [cameraUrl, setCameraUrl] = useState<string>('');
  const {
    connectionState: povConnectionState,
    error: povError,
    videoStream: povVideoStream,
    isStreaming: povIsStreaming,
    latencyMs: povLatencyMs,
    connect: povConnect,
    disconnect: povDisconnect,
    reconnect: povReconnect,
  } = useRobotPOV({ targetLatencyMs: 100 });

  // Model paths - using actual GLB models
  const [modelLoading, setModelLoading] = useState(false);
  const [robotVisible, setRobotVisible] = useState(false);
  const [robotDropping, setRobotDropping] = useState(false);

  // Robot drop-in animation when template is selected
  useEffect(() => {
    if (hardwareTemplateId && !robotVisible) {
      setRobotDropping(true);
      setRobotVisible(true);
      const timer = setTimeout(() => setRobotDropping(false), 1000);
      return () => clearTimeout(timer);
    } else if (!hardwareTemplateId) {
      setRobotVisible(false);
    }
  }, [hardwareTemplateId]);

  // Reset robot visibility on hardwareTemplateId change
  useEffect(() => {
    if (!hardwareTemplateId) {
      setRobotVisible(false);
      setRobotDropping(false);
    }
  }, [hardwareTemplateId]);

  // ROB-413: Call POST /api/robots/:robotId/template when hardwareTemplateId changes
  // If robot is connected, send template to robot. Otherwise, template is stored in state.
  const prevHardwareTemplateId = useRef(hardwareTemplateId);
  useEffect(() => {
    // Only call API when hardwareTemplateId actually changes and robot is connected
    if (hardwareTemplateId &&
        hardwareTemplateId !== prevHardwareTemplateId.current &&
        connectedRobotId) {
      const callTemplateApi = async () => {
        try {
          const token = localStorage.getItem('token') || '';
          const response = await fetch(`/api/robots/${connectedRobotId}/template`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({ hardware_template_id: hardwareTemplateId }),
          });
          if (!response.ok) {
            console.error('Failed to set robot template:', response.statusText);
          }
        } catch (err) {
          console.error('Error setting robot template:', err);
        }
      };
      callTemplateApi();
    }
    prevHardwareTemplateId.current = hardwareTemplateId;
  }, [hardwareTemplateId, connectedRobotId]);

  const modelPaths = {
    astronaut: '/models/astronaut.glb' as string | undefined,
    rover: '/models/robot.glb' as string | undefined,
    arm: '/models/robot.glb' as string | undefined,
  };

  // Get the appropriate model path based on template
  const getModelPath = () => {
    if (hardwareTemplateId === 'arm') return modelPaths.arm;
    if (hardwareTemplateId === 'rover') return modelPaths.rover;
    return modelPaths.astronaut;
  };

  const handleCommand = useCallback(
    (command: RobotCommand) => {
      // Check if this is a sensor command
      if (command === 'get_distance' || command === 'get_light_level' || command === 'get_camera_light' || command === 'line_tracker') {
        // Handle sensor commands
        const reading = readSensor(command, cameraLightDirection);
        onCommandExecute?.(command);

        // Update local state for display
        if (command === 'get_camera_light') {
          setCameraLightReading(typeof reading === 'number' ? reading : null);
        } else if (command === 'line_tracker') {
          setLineTrackerReading(reading as LinePosition);
        }

        awardXP(5);
        return;
      }

      // Handle movement/action commands
      if (isMultiplayer && mpGamePhase === 'playing') {
        // Send command to Colyseus server
        const cmd = { action: command, speed: 1, degrees: 45 };
        sendInput([cmd]);
      }

      executeCommand(command);
      onCommandExecute?.(command);

      // Award XP for command execution (small amount for practice)
      awardXP(5);
    },
    [executeCommand, readSensor, onCommandExecute, awardXP, cameraLightDirection, isMultiplayer, mpGamePhase, sendInput]
  );

  // Request AI hint during practice
  const handleRequestHint = async () => {
    if (!activeMission) return;

    setIsLoadingHint(true);
    setShowAIHint(true);

    try {
      // Simulated AI hint based on mission
      const hints = [
        '💡 Gợi ý: Thử di chuyển robot về phía trước 2 bước trước khi rẽ!',
        '💡 Gợi ý: Sử dụng lệnh "quay trái" trước khi đi tới!',
        '💡 Gợi ý: Hãy chắc chắn robot của bạn hướng về phía mục tiêu!',
        '💡 Gợi ý: Thử sử dụng ít lệnh hơn để nhận điểm thưởng!',
      ];
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      setAiHint(randomHint);
    } catch (err) {
      setAiHint('⚠️ Không thể lấy gợi ý. Thử lại sau!');
    } finally {
      setIsLoadingHint(false);
    }
  };

  // Request AI review after mission completion
  const handleRequestReview = async () => {
    if (!activeMission) return;

    setIsLoadingHint(true);
    try {
      const token = localStorage.getItem('token') || '';
      const result = await reviewSpaceMission({
        lessonId: activeMission.id,
        challengeResult: true,
        userId: localStorage.getItem('studentId') || undefined,
      });
      setMissionResult(result);
      setAiHint(`🤖 AI Review:\n${result.feedback}`);
    } catch (err) {
      setAiHint('⚠️ Không thể kết nối AI. Vui lòng thử lại!');
    } finally {
      setIsLoadingHint(false);
    }
  };

  // Camera Light Sensor reading using raycasting
  const handleCameraLightRead = (direction: LightDirection) => {
    const level = calculateLightLevel(position, direction, rotation);
    setCameraLightReading(level);
    setLocalCameraLightDir(direction); // Update local state for UI
    setCameraLightDirection(direction); // Sync with store for Blockly
    awardXP(5);
  };

  // Line Tracker reading using raycasting
  const handleLineTrackerRead = () => {
    const result = readLineTracker(position.x, position.z, rotation);
    setLineTrackerReading(result);
    awardXP(5);
  };

  const activeMission = missions.find((m) => m.id === activeMissionId);

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas with Physics */}
      <Canvas gl={{ antialias: true, alpha: true }} style={{ width: '100%', height: '100%' }}>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={60} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={50}
          target={[position.x, position.y, position.z]}
        />
        {/* Space physics with low gravity for space environment */}
        <Physics gravity={GRAVITY_PRESETS.space}>
          <SpaceEnvironment />
          <LightSensorRaycaster
            robotPosition={position}
            robotRotation={rotation}
          />
          <LineTrackerRaycaster />

          {/* Render Z-Arm when arm template is selected */}
          {hardwareTemplateId === 'arm' && (
            <group>
              <ZArm
                position={[position.x, position.y, position.z]}
                isEnabled={true}
                targetTemplate="follow"
              />
            </group>
          )}

          {/* Render rover/car with tip-over physics */}
          {hardwareTemplateId === 'rover' && (
            <group
              position={[0, robotDropping ? 10 : 0, 0]}
            >
              <CarPhysicsBody
                position={[position.x, position.y, position.z]}
                centerOfMassY={0.4}
                lateralFriction={0.3}
                mass={2}
                onTipOver={() => console.log('Car tipped over!')}
                onKickout={() => {
                  console.log('Car kicked out!');
                  // Reset car position after kickout
                  setTimeout(() => resetRobot(), 1000);
                }}
              >
                <SpaceRobot
                  position={[0, 0, 0]}
                  isExecuting={isExecuting}
                  currentCommand={currentCommand}
                  modelPath={getModelPath()}
                />
              </CarPhysicsBody>
              {/* Opponent Robot (Multiplayer) */}
              {isMultiplayer && opponentState && (
                <SpaceRobot
                  position={[opponentState.position.x, 0, opponentState.position.z]}
                  isExecuting={false}
                  currentCommand={null}
                  modelPath={getModelPath()}
                />
              )}
            </group>
          )}

          {/* Render astronaut robot for other templates */}
          {hardwareTemplateId && hardwareTemplateId !== 'arm' && hardwareTemplateId !== 'rover' && (
            <group
              position={[0, robotDropping ? 10 : 0, 0]}
            >
              <SpaceRobot
                position={[position.x, position.y, position.z]}
                isExecuting={isExecuting}
                currentCommand={currentCommand}
                modelPath={getModelPath()}
              />
              {/* Opponent Robot (Multiplayer) */}
              {isMultiplayer && opponentState && (
                <SpaceRobot
                  position={[opponentState.position.x, 0, opponentState.position.z]}
                  isExecuting={false}
                  currentCommand={null}
                  modelPath={getModelPath()}
                />
              )}
            </group>
          )}

          {/* Placeholder when no robot selected */}
          {!hardwareTemplateId && (
            <group position={[0, 5, 0]}>
              <mesh position={[0, 0, 0]}>
                <ringGeometry args={[0.5, 0.7, 32]} />
                <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} />
              </mesh>
            </group>
          )}
        </Physics>
      </Canvas>

      {/* Loading Indicator */}
      <LoadingIndicator isLoading={modelLoading} message="Loading 3D Assets..." />

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30"
          style={{ boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)' }}
        >
          <h3 className="text-cyan-400 font-bold text-sm mb-2">📍 Vị trí Robot</h3>
          <p className="text-white text-xs font-mono">
            X: {position.x.toFixed(1)} | Y: {position.y.toFixed(1)} | Z: {position.z.toFixed(1)}
          </p>
          <p className="text-purple-400 text-xs mt-1">
            Góc quay: {(rotation * 180 / Math.PI).toFixed(0)}°
          </p>
          <div className="mt-2 pt-2 border-t border-cyan-500/20">
            <p className="text-orange-400 text-xs font-bold">⭐ Điểm: {score}</p>
            {xpEarned > 0 && (
              <p className="text-green-400 text-xs mt-1">+{xpEarned} XP tạm tính</p>
            )}
          </div>
          {/* Multiplayer Status */}
          <div className="mt-2 pt-2 border-t border-cyan-500/20">
            <p className="text-cyan-400 text-xs font-bold">🎮 Multiplayer</p>
            <p className="text-white text-xs">
              {connectionState === 'connected' ? (
                <span className="text-green-400">● Kết nối</span>
              ) : connectionState === 'connecting' ? (
                <span className="text-yellow-400">● Đang kết nối...</span>
              ) : (
                <span className="text-gray-400">● Chưa kết nối</span>
              )}
            </p>
            {isMultiplayer && mpGamePhase && (
              <p className="text-purple-400 text-xs mt-1">
                {mpGamePhase === 'waiting' && '⏳ Chờ đối thủ...'}
                {mpGamePhase === 'countdown' && `🔢 Đếm ngược: ${countdownTimer}`}
                {mpGamePhase === 'playing' && '⚔️ Đang chiến đấu!'}
                {mpGamePhase === 'ended' && (winner === mySessionId ? '🏆 Thắng!' : '😢 Thua!')}
              </p>
            )}
          </div>
          {cameraLightReading !== null && (
            <div className="mt-2 pt-2 border-t border-cyan-500/20">
              <p className="text-yellow-400 text-xs font-bold">📷 Camera Light</p>
              <p className="text-white text-xs">
                {cameraLightDirection === 'FORWARD' ? '➡️' : cameraLightDirection === 'BACKWARD' ? '⬅️' : cameraLightDirection === 'LEFT' ? '⬆️' : '⬇️'}: {cameraLightReading}%
              </p>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-cyan-500/20">
            <p className="text-purple-400 text-xs font-bold">📍 Line Tracker</p>
            <p className="text-white text-xs">
              {lineTrackerReading === 'LEFT' ? '⬅️ LEFT' : lineTrackerReading === 'RIGHT' ? '➡️ RIGHT' : lineTrackerReading === 'CENTER' ? '⬆️ CENTER' : '⬜ NONE'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Robot State Panel - Shows internal robot state (ROB-697) */}
      {hardwareTemplateId && (
        <div className="absolute top-4 left-80 pointer-events-none">
          <RobotStatePanel />
        </div>
      )}

      {/* Hardware Garage Overlay - shown when no template selected */}
      <AnimatePresence>
        {!hardwareTemplateId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-20"
          >
            <HardwareGarage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multiplayer Join/Leave Button */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {!isMultiplayer ? (
            <button
              onClick={() => joinRoom()}
              disabled={connectionState === 'connecting'}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              style={{ boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)' }}
            >
              {connectionState === 'connecting' ? '⏳ Đang kết nối...' : '🎮 Chơi Multiplayer'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {mpGamePhase === 'ended' && (
                <button
                  onClick={requestRestart}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full text-white font-bold text-xs hover:scale-105 active:scale-95 transition-all"
                  style={{ boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)' }}
                >
                  🔄 Chơi lại
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white font-bold text-xs hover:scale-105 active:scale-95 transition-all"
                style={{ boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)' }}
              >
                🚪 Rời phòng
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Game Phase Overlays */}
      <AnimatePresence>
        {/* Waiting for opponent */}
        {isMultiplayer && mpGamePhase === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 pointer-events-none"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">⏳</div>
              <h2 className="text-cyan-400 text-2xl font-bold mb-2">Đang chờ đối thủ...</h2>
              <p className="text-white text-sm">Vui lòng chờ trong giây lát</p>
              <div className="mt-4 flex justify-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Countdown */}
        {isMultiplayer && mpGamePhase === 'countdown' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-30 pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                key={countdownTimer}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-500 to-orange-400"
                style={{ WebkitTextStroke: '2px white' }}
              >
                {countdownTimer}
              </motion.div>
              <h2 className="text-white text-xl font-bold mt-2">Sẵn sàng!</h2>
            </div>
          </motion.div>
        )}

        {/* Game Ended */}
        {isMultiplayer && mpGamePhase === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30"
          >
            <div className="text-center">
              <div className="text-8xl mb-4">
                {winner === mySessionId ? '🏆' : '😢'}
              </div>
              <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                {winner === mySessionId ? 'Chiến Thắng!' : 'Thua Rồi!'}
              </h2>
              <p className="text-gray-300 text-sm mt-2">
                {winner === mySessionId ? 'Chúc mừng bạn đã chiến thắng!' : 'Đừng nản chí, thử lại nhé!'}
              </p>
              <button
                onClick={requestRestart}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full text-white font-bold text-lg hover:scale-105 active:scale-95 transition-all"
                style={{ boxShadow: '0 0 40px rgba(0, 240, 255, 0.5)' }}
              >
                🔄 Chơi lại
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Panel - disabled when no template selected */}
      <AnimatePresence>
        {showCommands && hardwareTemplateId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80"
          >
            <div
              className="bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-purple-500/30"
              style={{ boxShadow: '0 0 30px rgba(155, 89, 182, 0.3)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-purple-400 font-bold text-sm">🕹️ Điều khiển Robot</h3>
                <button
                  onClick={() => setShowCommands(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(COMMAND_LABELS).map(([cmd, label]) => (
                  <button
                    key={cmd}
                    onClick={() => handleCommand(cmd as RobotCommand)}
                    disabled={isExecuting}
                    className={`
                      px-2 py-2 rounded-lg text-xs font-bold transition-all
                      ${isExecuting
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-br from-cyan-600 to-purple-600 text-white hover:scale-105 active:scale-95'
                      }
                    `}
                    style={{
                      boxShadow: isExecuting ? 'none' : '0 0 15px rgba(0, 240, 255, 0.4)',
                    }}
                  >
                    {label.split(' ')[0]}
                    <span className="block text-[10px] mt-0.5 opacity-80">
                      {label.split(' ').slice(1).join(' ')}
                    </span>
                  </button>
                ))}
              </div>

              {/* Camera Light Sensor Row */}
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <p className="text-yellow-400 text-xs font-bold mb-2">📷 Camera Light Sensor</p>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => handleCameraLightRead('FORWARD')}
                    className="px-2 py-1.5 rounded bg-yellow-600/60 hover:bg-yellow-500/60 text-white text-xs font-bold transition-all"
                    style={{ boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}
                  >
                    ➡️
                  </button>
                  <button
                    onClick={() => handleCameraLightRead('BACKWARD')}
                    className="px-2 py-1.5 rounded bg-yellow-600/60 hover:bg-yellow-500/60 text-white text-xs font-bold transition-all"
                    style={{ boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}
                  >
                    ⬅️
                  </button>
                  <button
                    onClick={() => handleCameraLightRead('LEFT')}
                    className="px-2 py-1.5 rounded bg-yellow-600/60 hover:bg-yellow-500/60 text-white text-xs font-bold transition-all"
                    style={{ boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => handleCameraLightRead('RIGHT')}
                    className="px-2 py-1.5 rounded bg-yellow-600/60 hover:bg-yellow-500/60 text-white text-xs font-bold transition-all"
                    style={{ boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}
                  >
                    ⬇️
                  </button>
                </div>
                {cameraLightReading !== null && (
                  <p className="text-white text-center text-xs mt-1 font-mono">
                    {cameraLightDirection}: {cameraLightReading}%
                  </p>
                )}
              </div>

              {/* Line Tracker Row */}
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <p className="text-purple-400 text-xs font-bold mb-2">📍 Line Tracker</p>
                <button
                  onClick={handleLineTrackerRead}
                  className="w-full px-2 py-2 rounded bg-purple-600/60 hover:bg-purple-500/60 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 0 10px rgba(155, 89, 182, 0.3)' }}
                >
                  🔍 Đọc Line Tracker
                  <span className={`
                    px-2 py-0.5 rounded text-[10px] font-bold
                    ${lineTrackerReading === 'NONE' ? 'bg-gray-600' :
                      lineTrackerReading === 'CENTER' ? 'bg-green-600' : 'bg-yellow-600'}
                  `}>
                    {lineTrackerReading}
                  </span>
                </button>
              </div>

              <button
                onClick={resetRobot}
                className="mt-3 w-full py-2 bg-red-600/80 hover:bg-red-500 rounded-lg text-white text-xs font-bold transition-all"
              >
                🔄 Reset Robot
              </button>

              {/* AI Hint Button */}
              <button
                onClick={handleRequestHint}
                className="mt-2 w-full py-2 bg-cyan-600/80 hover:bg-cyan-500 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isLoadingHint ? '⏳ Đang tải...' : '💡 Gợi ý AI'}
              </button>

              {/* AI Review Button */}
              <button
                onClick={handleRequestReview}
                className="mt-2 w-full py-2 bg-purple-600/80 hover:bg-purple-500 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                🤖 AI Review
              </button>
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Toggle Commands Button */}
      {hardwareTemplateId && !showCommands && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowCommands(true)}
          className="absolute bottom-4 left-4 bg-purple-600/80 hover:bg-purple-500 px-4 py-2 rounded-full text-white text-sm font-bold"
          style={{ boxShadow: '0 0 20px rgba(155, 89, 182, 0.5)' }}
        >
          🕹️ Điều khiển
        </motion.button>
      )}

      {/* Mission Panel */}
      <div className="absolute top-4 right-4 w-72">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30"
          style={{ boxShadow: '0 0 20px rgba(255, 107, 53, 0.2)' }}
        >
          <h3 className="text-orange-400 font-bold text-sm mb-3">🎯 Nhiệm vụ</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {missions.map((mission) => (
              <button
                key={mission.id}
                onClick={() => setActiveMission(mission.id)}
                className={`
                  w-full text-left p-2 rounded-lg transition-all text-xs
                  ${mission.id === activeMissionId
                    ? 'bg-orange-500/30 border border-orange-500/50'
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }
                  ${mission.completed ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={mission.completed ? 'text-green-400' : 'text-gray-400'}>
                    {mission.completed ? '✅' : mission.difficulty === 'beginner' ? '🟢' : mission.difficulty === 'intermediate' ? '🟡' : '🔴'}
                  </span>
                  <span className="text-white font-bold">{mission.title}</span>
                </div>
                {mission.id === activeMissionId && (
                  <p className="text-gray-300 mt-1 text-[10px]">{mission.description}</p>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Current Command Display */}
      <AnimatePresence>
        {isExecuting && currentCommand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div
              className="px-6 py-3 rounded-full text-white font-bold text-lg"
              style={{
                background: 'linear-gradient(90deg, #00f0ff, #9b59b6, #ff6b35)',
                boxShadow: '0 0 40px rgba(0, 240, 255, 0.6)',
              }}
            >
              {COMMAND_LABELS[currentCommand]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div className="absolute bottom-20 right-4 w-48">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 border border-gray-600/30">
            <p className="text-gray-400 text-[10px] mb-1">📜 Lịch sử lệnh:</p>
            <p className="text-cyan-400 text-xs font-mono truncate">
              {commandHistory.slice(-3).map((cmd, i) => (
                <span key={i}>
                  {COMMAND_LABELS[cmd].split(' ')[0]}{' '}
                </span>
              ))}
              {commandHistory.length > 3 && <span className="text-gray-500">+{commandHistory.length - 3}</span>}
            </p>
          </div>
        </div>
      )}

      {/* AI Hint/Review Overlay */}
      <AnimatePresence>
        {showAIHint && aiHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96"
          >
            <div
              className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h4 className="text-cyan-400 font-bold text-sm">AI Assistant</h4>
                    <p className="text-white text-xs mt-1 whitespace-pre-wrap">
                      {aiHint}
                    </p>
                    {missionResult && (
                      <div className="mt-2 pt-2 border-t border-cyan-500/20">
                        <p className="text-green-400 text-xs">✅ Review passed: {missionResult.passed ? 'Yes' : 'No'}</p>
                        <p className="text-purple-400 text-xs">⭐ XP earned: {missionResult.xpEarned}</p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowAIHint(false)}
                  className="text-gray-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Robot POV Camera URL Input Panel */}
      <AnimatePresence>
        {showPOV && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
          >
            <div
              className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)', width: 320 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-cyan-400 font-bold text-sm">📹 Kết nối Robot POV</h4>
                <button
                  onClick={() => setShowPOV(false)}
                  className="text-gray-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-400 text-xs mb-3">
                Nhập địa chỉ IP của ESP32-CAM (VD: http://192.168.1.100)
              </p>
              <input
                type="text"
                value={cameraUrl}
                onChange={(e) => setCameraUrl(e.target.value)}
                placeholder="http://192.168.1.100"
                className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (cameraUrl) {
                      povConnect(cameraUrl);
                    }
                  }}
                  disabled={!cameraUrl || povConnectionState === 'connecting'}
                  className="flex-1 py-2 bg-cyan-600/80 hover:bg-cyan-500 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {povConnectionState === 'connecting' ? '⏳ Đang kết nối...' : '🔗 Kết nối'}
                </button>
                <button
                  onClick={() => {
                    povDisconnect();
                    setCameraUrl('');
                    setShowPOV(false);
                  }}
                  className="px-3 py-2 bg-gray-600/80 hover:bg-gray-500 rounded-lg text-white text-xs font-bold"
                >
                  Ngắt
                </button>
              </div>
              {povError && (
                <p className="text-red-400 text-xs mt-2">❌ {povError}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Robot POV Overlay - Picture-in-Picture */}
      {povIsStreaming && (
        <RobotPOVOverlay
          videoStream={povVideoStream}
          connectionState={povConnectionState as POVConnectionState}
          error={povError}
          onReconnect={povReconnect}
          latencyMs={povLatencyMs}
          targetLatencyMs={100}
          position="bottom-left"
          size="medium"
          minimized={povMinimized}
          onToggleMinimize={() => setPovMinimized(!povMinimized)}
        />
      )}

      {/* POV Toggle Button */}
      {hardwareTemplateId && !showPOV && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowPOV(true)}
          className="absolute bottom-4 right-4 bg-cyan-600/80 hover:bg-cyan-500 px-4 py-2 rounded-full text-white text-sm font-bold z-20"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}
        >
          📹 Robot POV
        </motion.button>
      )}
    </div>
  );
}