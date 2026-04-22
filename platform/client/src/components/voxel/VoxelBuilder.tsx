/**
 * VoxelBuilder - Interactive voxel building UI
 *
 * Features:
 * - Color palette
 * - Tool selection (add/remove/paint)
 * - Undo/redo buttons
 * - Clear grid
 * - Export/import functionality
 * - AI generation (demo)
 * - XP rewards and badges
 */

import { useState } from 'react';
import { Box, VStack, HStack, Button, Text, SimpleGrid, IconButton, Tooltip, Separator, Spinner, Badge } from '@chakra-ui/react';
import {
  VscAdd, VscTrash, VscPaintcan, VscDebugRestart, VscHistory, VscRedo,
  VscCloudDownload, VscCloudUpload, VscSparkle
} from 'react-icons/vsc';
import { useVoxelBuilderStore, VOXEL_COLORS, VoxelColor, VoxelTool } from '../../stores/voxelStore';
import { DEMO_VOXEL_STRUCTURES } from '../../services/voxelAiService';

interface VoxelBuilderProps {
  onAIClick?: () => void;
}

export function VoxelBuilder({ onAIClick }: VoxelBuilderProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    voxels,
    selectedColor,
    selectedTool,
    gridSize,
    undo,
    redo,
    clearGrid,
    exportVoxels,
    importVoxels,
    setSelectedColor,
    setSelectedTool,
    historyIndex,
    history,
    totalXp,
    badges,
    generateFromPrompt,
  } = useVoxelBuilderStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = () => {
    const data = exportVoxels();
    navigator.clipboard.writeText(data);
    alert('Đã sao chép dữ liệu voxel!');
  };

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const success = importVoxels(text);
      if (success) {
        alert('Nhập voxel thành công!');
      } else {
        alert('Dữ liệu không hợp lệ');
      }
    } catch {
      alert('Không thể đọc clipboard');
    }
  };

  const handleGenerateVoxels = async () => {
    const prompt = aiPrompt.trim().toLowerCase();
    if (!prompt) return;

    setIsGenerating(true);
    try {
      // Check demo structures first
      if (DEMO_VOXEL_STRUCTURES[prompt]) {
        const demoVoxels = DEMO_VOXEL_STRUCTURES[prompt];
        const newVoxels = demoVoxels.map(v => ({ ...v }));
        useVoxelBuilderStore.getState().setVoxels([...voxels, ...newVoxels]);
        alert(`Đã tạo ${demoVoxels.length} voxels!`);
        setAiPrompt('');
        return;
      }

      // Try AI generation
      const result = await generateFromPrompt(prompt);
      if (result.length > 0) {
        alert(`Đã tạo ${result.length} voxels!`);
        setAiPrompt('');
      } else {
        alert('Không thể tạo voxel. Thử: simple-robot, cherry-blossom-tree, house');
      }
    } catch (err) {
      alert('Lỗi AI: Không thể kết nối dịch vụ AI');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box
      bg="gray.900"
      color="white"
      p={4}
      borderRadius="lg"
      w="280px"
      maxH="calc(100vh - 100px)"
      overflowY="auto"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="lg" fontWeight="bold">🧱 Voxel Builder</Text>
          <Text fontSize="sm" color="gray.400">{voxels.length} voxels | Grid {gridSize}x{gridSize}</Text>
        </Box>

        {/* XP and Badges */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <HStack justify="space-between">
            <Text fontSize="sm" color="yellow.400">
              ⭐ {totalXp} XP
            </Text>
            <HStack>
              {badges.slice(0, 3).map(badge => (
                <Tooltip key={badge.id} label={badge.name}>
                  <Text fontSize="lg">{badge.icon}</Text>
                </Tooltip>
              ))}
            </HStack>
          </HStack>
          {badges.length > 0 && (
            <Text fontSize="xs" color="gray.500" mt={1}>
              {badges.map(b => b.name).join(', ')}
            </Text>
          )}
        </Box>

        <Separator borderColor="gray.700" />

        {/* Tools */}
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>Công cụ</Text>
          <HStack spacing={2}>
            <Tooltip label="Thêm voxel">
              <IconButton
                aria-label="Add voxel"
                icon={<VscAdd />}
                size="md"
                colorScheme={selectedTool === 'add' ? 'blue' : 'gray'}
                variant={selectedTool === 'add' ? 'solid' : 'outline'}
                onClick={() => setSelectedTool('add')}
              />
            </Tooltip>
            <Tooltip label="Xóa voxel">
              <IconButton
                aria-label="Remove voxel"
                icon={<VscTrash />}
                size="md"
                colorScheme={selectedTool === 'remove' ? 'red' : 'gray'}
                variant={selectedTool === 'remove' ? 'solid' : 'outline'}
                onClick={() => setSelectedTool('remove')}
              />
            </Tooltip>
            <Tooltip label="Tô màu voxel">
              <IconButton
                aria-label="Paint voxel"
                icon={<VscPaintcan />}
                size="md"
                colorScheme={selectedTool === 'paint' ? 'green' : 'gray'}
                variant={selectedTool === 'paint' ? 'solid' : 'outline'}
                onClick={() => setSelectedTool('paint')}
              />
            </Tooltip>
          </HStack>
        </Box>

        {/* Colors */}
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>Màu sắc</Text>
          <SimpleGrid columns={5} spacing={2}>
            {VOXEL_COLORS.map((color) => (
              <Box
                key={color}
                w="40px"
                h="40px"
                bg={color}
                borderRadius="md"
                cursor="pointer"
                border="3px solid"
                borderColor={selectedColor === color ? 'white' : 'transparent'}
                _hover={{ transform: 'scale(1.1)' }}
                transition="all 0.15s"
                onClick={() => setSelectedColor(color as VoxelColor)}
              />
            ))}
          </SimpleGrid>
        </Box>

        <Separator borderColor="gray.700" />

        {/* History */}
        <HStack spacing={2}>
          <Tooltip label="Undo (Ctrl+Z)">
            <IconButton
              aria-label="Undo"
              icon={<VscHistory />}
              size="sm"
              variant="outline"
              isDisabled={!canUndo}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip label="Redo (Ctrl+Y)">
            <IconButton
              aria-label="Redo"
              icon={<VscRedo />}
              size="sm"
              variant="outline"
              isDisabled={!canRedo}
              onClick={redo}
            />
          </Tooltip>
          <Tooltip label="Xóa tất cả">
            <IconButton
              aria-label="Clear all"
              icon={<VscDebugRestart />}
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={clearGrid}
            />
          </Tooltip>
        </HStack>

        <Separator borderColor="gray.700" />

        {/* Save/Load */}
        <HStack spacing={2}>
          <Tooltip label="Xuất dữ liệu">
            <IconButton
              aria-label="Export"
              icon={<VscCloudDownload />}
              size="sm"
              variant="outline"
              onClick={handleExport}
            />
          </Tooltip>
          <Tooltip label="Nhập dữ liệu">
            <IconButton
              aria-label="Import"
              icon={<VscCloudUpload />}
              size="sm"
              variant="outline"
              onClick={handleImport}
            />
          </Tooltip>
        </HStack>

        <Separator borderColor="gray.700" />

        {/* AI Generation */}
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            <VscSparkle style={{ display: 'inline', marginRight: '4px' }} />
            Tạo bằng AI
          </Text>
          <VStack spacing={2}>
            <input
              type="text"
              placeholder="VD: simple-robot..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating) {
                  handleGenerateVoxels();
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                backgroundColor: '#2d3748',
                color: 'white',
                fontSize: '14px',
              }}
            />
            <Button
              leftIcon={isGenerating ? <Spinner size="xs" /> : <VscSparkles />}
              colorScheme="purple"
              size="sm"
              w="100%"
              isDisabled={!aiPrompt.trim() || isGenerating}
              onClick={handleGenerateVoxels}
            >
              {isGenerating ? 'Đang tạo...' : 'Tạo voxel'}
            </Button>
          </VStack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Demo: simple-robot, cherry-blossom-tree, house
          </Text>
        </Box>

        {/* Help */}
        <Box p={3} bg="gray.800" borderRadius="md">
          <Text fontSize="xs" color="gray.400">
            💡 <strong>Hướng dẫn:</strong><br />
            - Click trái: Thêm/Xóa/Tô màu<br />
            - Kéo: Xoay view | Cuộn: Zoom<br />
            - Ctrl+Z/Y: Undo/Redo<br />
            - Delete: Xóa voxel đã chọn
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}

export default VoxelBuilder;
