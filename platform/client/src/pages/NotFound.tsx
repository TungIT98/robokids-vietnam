import React from 'react';
import { Box, Button, Text, VStack, Heading, Container, Link } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="md" centerContent py={20}>
        <VStack gap={8} textAlign="center">
          {/* 404 Display */}
          <Box position="relative">
            <Text
              fontSize="9xl"
              fontWeight="bold"
              color="gray.200"
              lineHeight="1"
            >
              404
            </Text>
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
            >
              <Text fontSize="6xl">🤖</Text>
            </Box>
          </Box>

          {/* Message */}
          <VStack gap={3}>
            <Heading size="lg" color="gray.800">
              Trang không tìm thấy
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Rất tiếc! Trang bạn đang tìm không tồn tại.
            </Text>
            <Text color="gray.500" fontSize="md">
              Có thể liên kết đã hết hạn hoặc bạn đã nhập sai địa chỉ.
            </Text>
          </VStack>

          {/* Robot illustration */}
          <Box
            w={200}
            h={150}
            bg="blue.50"
            borderRadius="xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="5xl">🔍</Text>
          </Box>

          {/* Actions */}
          <VStack gap={3} width="100%" maxW="sm">
            <Link as={RouterLink} href="/" width="100%">
              <Button colorScheme="blue" size="lg" width="100%">
                Về trang chủ
              </Button>
            </Link>
            <Link as={RouterLink} href="/lessons" width="100%">
              <Button variant="outline" size="lg" width="100%">
                Xem bài học
              </Button>
            </Link>
          </VStack>

          {/* Help text */}
          <Text color="gray.400" fontSize="sm">
            Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ hỗ trợ.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};

export default NotFound;
