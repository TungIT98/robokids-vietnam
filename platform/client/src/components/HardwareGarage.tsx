import { motion } from 'framer-motion';
import { useSpaceRobotStore, HardwareTemplate } from '../stores/spaceRobotStore';

interface HardwareGarageProps {
  onSelect?: (template: HardwareTemplate) => void;
}

const ROVER_TEMPLATE = {
  id: 'rover' as HardwareTemplate,
  name: 'X-Rover',
  emoji: '🚗',
  description: 'Xe rover 2 bánh',
  ports: 'IN1 - IN2 - IN3 - IN4',
  portDescription: 'Cắm động cơ vào 4 cổng IN1, IN2, IN3, IN4',
  color: 'from-cyan-500 to-blue-600',
  borderColor: 'border-cyan-500/50',
  selectedBg: 'bg-cyan-500/20',
};

const ARM_TEMPLATE = {
  id: 'arm' as HardwareTemplate,
  name: 'Z-Arm',
  emoji: '🦾',
  description: 'Cánh tay robot',
  ports: 'PWM (Servo)',
  portDescription: 'Cắm servo vào cổng PWM',
  color: 'from-orange-500 to-red-600',
  borderColor: 'border-orange-500/50',
  selectedBg: 'bg-orange-500/20',
};

export default function HardwareGarage({ onSelect }: HardwareGarageProps) {
  const { hardwareTemplateId, setHardwareTemplate } = useSpaceRobotStore();

  const handleSelect = (template: HardwareTemplate) => {
    setHardwareTemplate(template);
    onSelect?.(template);
  };

  const templates = [ROVER_TEMPLATE, ARM_TEMPLATE];

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-gray-700/50">
      <h3 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
        <span>🔧</span> Hardware Garage
      </h3>
      <p className="text-gray-400 text-xs mb-4">
        Chọn template robot để bắt đầu lắp ráp và lập trình
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => {
          const isSelected = hardwareTemplateId === template.id;

          return (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(template.id)}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-left
                ${isSelected
                  ? `${template.borderColor} ${template.selectedBg}`
                  : 'border-gray-700/50 bg-gray-900/50 hover:border-gray-600'
                }
              `}
              style={isSelected ? { boxShadow: `0 0 20px rgba(0, 240, 255, 0.3)` } : {}}
            >
              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-xs">✓</span>
                </motion.div>
              )}

              {/* Robot emoji */}
              <div className={`text-4xl mb-2 ${isSelected ? 'animate-bounce' : ''}`}>
                {template.emoji}
              </div>

              {/* Name and description */}
              <h4 className={`font-bold text-sm mb-1 ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                {template.name}
              </h4>
              <p className="text-gray-400 text-xs mb-3">
                {template.description}
              </p>

              {/* Pin mapping */}
              <div className={`mt-2 p-2 rounded-lg ${isSelected ? 'bg-black/40' : 'bg-gray-800/50'}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                  Cổng kết nối
                </p>
                <p className={`text-xs font-mono font-bold ${isSelected ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {template.ports}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {template.portDescription}
                </p>
              </div>

              {/* Visual port diagram */}
              <div className="mt-2 flex items-center justify-center gap-1">
                {template.id === 'rover' ? (
                  // Rover ports: 4 motor ports
                  <>
                    <PortIndicator label="IN1" active={isSelected} color="cyan" />
                    <PortIndicator label="IN2" active={isSelected} color="cyan" />
                    <PortIndicator label="IN3" active={isSelected} color="cyan" />
                    <PortIndicator label="IN4" active={isSelected} color="cyan" />
                  </>
                ) : (
                  // Arm ports: PWM servo
                  <>
                    <PortIndicator label="PWM" active={isSelected} color="orange" />
                    <PortIndicator label="PWM" active={isSelected} color="orange" />
                    <PortIndicator label="PWM" active={isSelected} color="orange" />
                  </>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selection status */}
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        {hardwareTemplateId ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">
              Đã chọn: <span className="font-bold text-white">
                {hardwareTemplateId === 'rover' ? 'X-Rover' : 'Z-Arm'}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>⚠️</span>
            <span>Chọn một template để bắt đầu lập trình</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PortIndicatorProps {
  label: string;
  active: boolean;
  color: 'cyan' | 'orange';
}

function PortIndicator({ label, active, color }: PortIndicatorProps) {
  const colorClass = color === 'cyan' ? 'bg-cyan-500/30 border-cyan-500' : 'bg-orange-500/30 border-orange-500';

  return (
    <div
      className={`
        px-2 py-1 rounded text-[10px] font-mono border
        ${active ? colorClass : 'bg-gray-800/50 border-gray-600 text-gray-500'}
      `}
    >
      {label}
    </div>
  );
}
