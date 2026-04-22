/**
 * VoxelBuilderPage - Standalone voxel building page
 *
 * Features:
 * - Full-screen 3D voxel canvas
 * - Sidebar with tools and controls
 * - AI generation integration
 * - Keyboard shortcuts (Ctrl+Z/Y, Delete)
 */

import { Box, Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { VoxelCanvas } from '../components/voxel/VoxelCanvas';
import { VoxelBuilder } from '../components/voxel/VoxelBuilder';
import { useVoxelShortcuts } from '../hooks/useVoxelShortcuts';
import { useVoxelBuilderStore } from '../stores/voxelStore';
import { DEMO_VOXEL_STRUCTURES } from '../services/voxelAiService';

export default function VoxelBuilderPage() {
  // Enable keyboard shortcuts
  useVoxelShortcuts();
  const [isGenerating] = useState(false);

  const generateFromPrompt = useVoxelBuilderStore((s) => s.generateFromPrompt);
  const setVoxels = useVoxelBuilderStore((s) => s.setVoxels);
  const voxels = useVoxelBuilderStore((s) => s.voxels);

  const handleAIClick = async () => {
    // Show demo options alert for now
    alert('AI Generation: Thử "simple-robot", "cherry-blossom-tree", hoặc "house"');
  };

  return (
    <Flex h="calc(100vh - 60px)" bg="gray.900">
      {/* Main 3D Canvas */}
      <Box flex={1} position="relative">
        <VoxelCanvas gridSize={16} showGrid={true} enableOrbitControls={true} />
      </Box>

      {/* Sidebar Controls */}
      <Box position="absolute" right={4} top={4} zIndex={10}>
        <VoxelBuilder onAIClick={handleAIClick} />
      </Box>
    </Flex>
  );
}
