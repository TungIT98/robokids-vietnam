import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Box, Text, HStack, CloseButton } from '@chakra-ui/react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op if not in provider
    return { showToast: () => {} };
  }
  return context;
};

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };
  return <Text fontSize="lg">{icons[type]}</Text>;
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  const bgColors = {
    success: 'green.50',
    error: 'red.50',
    info: 'blue.50',
    warning: 'yellow.50',
  };

  const borderColors = {
    success: 'green.400',
    error: 'red.400',
    info: 'blue.400',
    warning: 'yellow.400',
  };

  return (
    <Box
      bg={bgColors[toast.type]}
      borderLeft="4px solid"
      borderColor={borderColors[toast.type]}
      borderRadius="md"
      p={4}
      minW="300px"
      maxW="400px"
      boxShadow="md"
      style={{
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <HStack gap={3}>
        <ToastIcon type={toast.type} />
        <Text flex={1} color="gray.700">
          {toast.message}
        </Text>
        <CloseButton size="sm" onClick={onClose} />
      </HStack>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </Box>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <Box
        position="fixed"
        bottom={4}
        right={4}
        zIndex={9999}
        display="flex"
        flexDirection="column"
        gap={2}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

// Simple helper for one-off toasts without context
export const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
  info: (message: string) => console.info('ℹ️', message),
  warning: (message: string) => console.warn('⚠️', message),
};

export default ToastProvider;
