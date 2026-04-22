/**
 * RobotStatePanel - Displays robot internal state visualization (ROB-697)
 * Shows: LED indicators, Motor speed, Sensor readings, Battery, Signal strength
 * Kid-friendly design with emojis and colorful display
 */

import { useSpaceRobotStore } from '../../stores/spaceRobotStore';

interface LEDIndicatorProps {
  color: string;
  isOn: boolean;
  label: string;
}

function LEDIndicator({ color, isOn, label }: LEDIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-full transition-all duration-300"
        style={{
          backgroundColor: isOn ? color : '#374151',
          boxShadow: isOn ? `0 0 12px ${color}, 0 0 20px ${color}60` : 'none',
        }}
      />
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  );
}

interface BatteryBarProps {
  level: number;
}

function BatteryBar({ level }: BatteryBarProps) {
  const getColor = () => {
    if (level > 60) return '#22c55e';
    if (level > 30) return '#f97316';
    return '#ef4444';
  };

  const getEmoji = () => {
    if (level > 80) return '🔋';
    if (level > 50) return '🪫';
    if (level > 20) return '⚠️';
    return '🚨';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{getEmoji()}</span>
      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${level}%`,
            backgroundColor: getColor(),
            boxShadow: `0 0 8px ${getColor()}`,
          }}
        />
      </div>
      <span className="text-xs font-bold text-white w-8">{level}%</span>
    </div>
  );
}

interface SignalBarProps {
  strength: number;
}

function SignalBar({ strength }: SignalBarProps) {
  const bars = Math.ceil(strength / 25); // 0-4 bars

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">📶</span>
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className="w-1.5 rounded-sm transition-all duration-300"
            style={{
              height: `${bar * 4}px`,
              backgroundColor: bar <= bars ? '#22c55e' : '#374151',
              boxShadow: bar <= bars ? '0 0 6px #22c55e' : 'none',
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-300 ml-1">{strength}%</span>
    </div>
  );
}

interface MotorSpeedGaugeProps {
  speed: number;
}

function MotorSpeedGauge({ speed }: MotorSpeedGaugeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">⚡</span>
      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${speed}%`,
            background: 'linear-gradient(90deg, #00f0ff, #9b59b6)',
            boxShadow: '0 0 8px #00f0ff',
          }}
        />
      </div>
      <span className="text-xs font-bold text-white w-8">{speed}%</span>
    </div>
  );
}

interface SensorDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  emoji: string;
  color: string;
}

function SensorDisplay({ label, value, unit = '', emoji, color }: SensorDisplayProps) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm">{emoji}</span>
        <span className="text-xs text-gray-300">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

export default function RobotStatePanel() {
  const {
    batteryLevel,
    batteryCharging,
    ledColor,
    ledOn,
    motorSpeed,
    signalStrength,
    wifiConnected,
    lastSensorReading,
    isExecuting,
    currentCommand,
  } = useSpaceRobotStore();

  return (
    <div
      className="bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-cyan-500/30"
      style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-bold text-sm">🤖 Trạng thái Robot</h3>
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${wifiConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-xs text-gray-400">
            {wifiConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Battery */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">
            {batteryCharging ? '🔌 Đang sạc...' : '🔋 Pin'}
          </span>
        </div>
        <BatteryBar level={batteryLevel} />
      </div>

      {/* Motor Speed */}
      <div className="mb-3">
        <span className="text-xs text-gray-400 block mb-1">⚡ Tốc độ motor</span>
        <MotorSpeedGauge speed={motorSpeed} />
        {isExecuting && currentCommand && (
          <p className="text-xs text-purple-400 mt-1">
            ⚙️ Đang thực hiện: {currentCommand.replace('_', ' ')}
          </p>
        )}
      </div>

      {/* Signal Strength */}
      <div className="mb-3">
        <SignalBar strength={signalStrength} />
      </div>

      {/* LED Indicators */}
      <div className="mb-3">
        <span className="text-xs text-gray-400 block mb-2">💡 Đèn LED</span>
        <div className="grid grid-cols-2 gap-2">
          <LEDIndicator color={ledColor} isOn={ledOn} label={ledOn ? 'Bật' : 'Tắt'} />
          <LEDIndicator color="#22c55e" isOn={batteryLevel > 20} label="Pin OK" />
        </div>
      </div>

      {/* Quick Sensor Readings */}
      <div className="pt-3 border-t border-gray-700/50">
        <span className="text-xs text-gray-400 block mb-2">📡 Cảm biến</span>
        <div className="space-y-1">
          {lastSensorReading !== null ? (
            <SensorDisplay
              label="Giá trị cuối"
              value={typeof lastSensorReading === 'number'
                ? lastSensorReading.toFixed(1)
                : lastSensorReading}
              emoji="📊"
              color="#00f0ff"
            />
          ) : (
            <div className="text-xs text-gray-500 italic py-1">
              Chưa có đọc cảm biến
            </div>
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-3 pt-2 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500">RoboKids v1.0</span>
        {batteryLevel < 20 && (
          <span className="text-xs text-red-400 font-bold animate-pulse">
            ⚠️ Pin yếu!
          </span>
        )}
      </div>
    </div>
  );
}