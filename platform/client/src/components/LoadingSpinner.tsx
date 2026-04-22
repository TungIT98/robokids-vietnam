import React from 'react';
import { Box, Spinner, Text, VStack, Center } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  centerContent?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'xl',
  text = 'Đang tải...',
  fullScreen = false,
  centerContent = false,
}) => {
  const spinner = (
    <VStack gap={4}>
      <Spinner
        size={size}
        color="blue.500"
      />
      {text && (
        <Text color="gray.600" fontSize="md">
          {text}
        </Text>
      )}
    </VStack>
  );

  if (fullScreen) {
    return (
      <Center minH="100vh" bg="gray.50">
        {spinner}
      </Center>
    );
  }

  if (centerContent) {
    return <Center minH="200px">{spinner}</Center>;
  }

  return <Box py={8}>{spinner}</Box>;
};

export default LoadingSpinner;

// Skeleton loader for content
export const LoadingSkeleton: React.FC<{
  height?: string;
  count?: number;
}> = ({ height = '20px', count = 1 }) => {
  return (
    <Box gap={3} width="100%">
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          height={height}
          bg="gray.200"
          borderRadius="md"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Box>
  );
};
