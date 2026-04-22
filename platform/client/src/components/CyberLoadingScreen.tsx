import React from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';

interface CyberLoadingScreenProps {
  text?: string;
  progress?: number;
  fullScreen?: boolean;
}

export const CyberLoadingScreen: React.FC<CyberLoadingScreenProps> = ({
  text = 'Đang tải...',
  progress,
  fullScreen = true,
}) => {
  const container = (
    <VStack gap={6} position="relative" zIndex={1}>
      {/* Cyberpunk spinner */}
      <Box position="relative" w="80px" h="80px">
        {/* Outer ring */}
        <Box
          position="absolute"
          inset={0}
          border="3px solid"
          borderColor="cyan.400"
          borderRadius="full"
          opacity={0.3}
        />
        {/* Spinning arc */}
        <Box
          position="absolute"
          inset={0}
          border="3px solid transparent"
          borderTopColor="cyan.400"
          borderRadius="full"
          css={{
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
        {/* Inner core */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w="40px"
          h="40px"
          bg="cyan.400"
          borderRadius="full"
          opacity={0.6}
          css={{
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 1 },
            },
          }}
        />
        {/* Center dot */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w="12px"
          h="12px"
          bg="white"
          borderRadius="full"
        />
      </Box>

      {/* Loading text */}
      <Text
        fontSize="lg"
        fontWeight="bold"
        color="cyan.400"
        letterSpacing="widest"
        textTransform="uppercase"
        css={{
          animation: 'glow 2s ease-in-out infinite',
          '@keyframes glow': {
            '0%, 100%': { textShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff' },
            '50%': { textShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff' },
          },
        }}
      >
        {text}
      </Text>

      {/* Progress bar */}
      {progress !== undefined && (
        <Box w="200px" position="relative">
          <Box h="4px" bg="gray.800" borderRadius="full" overflow="hidden">
            <Box
              h="100%"
              w={`${progress}%`}
              bg="linear-gradient(90deg, #00d4ff, #00ff88)"
              borderRadius="full"
              transition="width 0.3s ease"
            />
          </Box>
          <Text fontSize="xs" color="gray.400" textAlign="center" mt={1}>
            {Math.round(progress)}%
          </Text>
        </Box>
      )}

      {/* Decorative scan line */}
      <Box
        position="absolute"
        top="-50px"
        left={0}
        right={0}
        h="100px"
        overflow="hidden"
        pointerEvents="none"
        css={{
          animation: 'scanline 3s linear infinite',
          '@keyframes scanline': {
            '0%': { transform: 'translateY(-100%)' },
            '100%': { transform: 'translateY(100vh)' },
          },
        }}
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="2px"
          bg="linear-gradient(90deg, transparent, cyan.400, transparent)"
          opacity={0.5}
        />
      </Box>
    </VStack>
  );

  if (fullScreen) {
    return (
      <Box
        position="fixed"
        inset={0}
        bg="gray.950"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={9999}
      >
        {/* Grid background */}
        <Box
          position="absolute"
          inset={0}
          opacity={0.1}
          bgImage="linear-gradient(cyan.400 1px, transparent 1px), linear-gradient(90deg, cyan.400 1px, transparent 1px)"
          bgSize="50px 50px"
        />
        {container}
      </Box>
    );
  }

  return (
    <Box
      minH="200px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.950"
      borderRadius="lg"
    >
      {container}
    </Box>
  );
};

export default CyberLoadingScreen;