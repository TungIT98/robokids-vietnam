import { motion, AnimatePresence } from 'framer-motion';

interface LoadingIndicatorProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingIndicator({
  isLoading,
  progress,
  message = 'Loading 3D Model...',
  fullScreen = false
}: LoadingIndicatorProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 z-50 bg-black/80' : 'absolute inset-0'}`}
        >
          <div className="flex flex-col items-center">
            {/* 3D rotating cube animation */}
            <div className="relative w-16 h-16 mb-4">
              <motion.div
                className="absolute inset-0 border-4 border-cyan-500 rounded-lg"
                style={{ borderRadius: '4px' }}
                animate={{
                  rotateX: [0, 180, 360],
                  rotateY: [0, 360, 360],
                  scale: [1, 0.8, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <motion.div
                className="absolute inset-2 border-4 border-purple-500 rounded-lg"
                style={{ borderRadius: '4px' }}
                animate={{
                  rotateX: [360, 180, 0],
                  rotateY: [360, 0, 360],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </div>

            <p className="text-cyan-400 font-bold text-sm mb-2">{message}</p>

            {progress !== undefined && (
              <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <p className="text-gray-500 text-xs mt-2">
              {progress !== undefined ? `${Math.round(progress)}%` : 'Please wait...'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}