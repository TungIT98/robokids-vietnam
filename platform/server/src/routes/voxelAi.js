/**
 * Voxel AI Routes - API endpoints for AI-powered voxel generation
 *
 * POST /api/ai/voxel-generate - Generate voxel structure from text prompt
 */

import express from 'express';
import { generateVoxelsFromPrompt } from '../services/voxelAiService.js';

const router = express.Router();

/**
 * POST /api/ai/voxel-generate
 * Generate voxel structure from text prompt
 *
 * Body: { prompt: string, gridSize?: number, preferredColors?: string[] }
 * Response: { voxels: Voxel[], description: string, model: string, success: boolean }
 */
router.post('/voxel-generate', async (req, res) => {
  try {
    const { prompt, gridSize = 16, preferredColors } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid prompt',
        success: false
      });
    }

    // Rate limit check (basic - could be enhanced with Redis)
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log(`[VoxelAI] Generation request from ${clientIp}: "${prompt}"`);

    // Generate voxels using MiniMax AI
    const result = await generateVoxelsFromPrompt({
      prompt,
      gridSize,
      preferredColors
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[VoxelAI] Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/ai/voxel-structures
 * Get available demo voxel structures
 */
router.get('/voxel-structures', (req, res) => {
  res.json({
    structures: [
      { id: 'simple-robot', name: 'Robot Đơn Giản', prompt: 'simple-robot' },
      { id: 'cherry-blossom-tree', name: 'Cây Hoa Anh Đào', prompt: 'cherry-blossom-tree' },
      { id: 'house', name: 'Ngôi Nhà', prompt: 'house' },
    ],
    success: true
  });
});

export default router;
