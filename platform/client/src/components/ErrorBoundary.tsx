import React, { Component, ReactNode } from 'react';
import { Box, Text, Button, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          minH="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="gray.50"
          p={8}
        >
          <VStack gap={6} maxW="md" textAlign="center">
            <Box
              w={20}
              h={20}
              borderRadius="full"
              bg="red.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="3xl">⚠️</Text>
            </Box>

            <VStack gap={2}>
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                Đã xảy ra lỗi
              </Text>
              <Text color="gray.600">
                Rất tiếc, đã có lỗi không mong muốn xảy ra.
              </Text>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  mt={4}
                  p={4}
                  bg="gray.100"
                  borderRadius="md"
                  textAlign="left"
                  fontSize="sm"
                  fontFamily="mono"
                  whiteSpace="pre-wrap"
                >
                  {this.state.error.message}
                </Box>
              )}
            </VStack>

            <Button
              colorScheme="blue"
              onClick={this.handleReset}
              size="lg"
            >
              Thử lại
            </Button>

            <Button
              variant="ghost"
              onClick={() => window.location.href = '/'}
            >
              Về trang chủ
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
