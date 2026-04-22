/**
 * Voxel AI Service - Generate voxels from text prompts using MiniMax API
 *
 * Uses MiniMax API to generate 3D voxel structures from text descriptions.
 * Falls back to procedural generation for simple shapes.
 */

import { chatWithAI } from './minimax.js';

// Voxel type (for reference)
// @typedef {{ x: number, y: number, z: number, color: string }} Voxel

// Color palette for voxel generation
const VOXEL_COLORS = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#ffffff'
];

/**
 * System prompt for voxel generation AI
 */
const VOXEL_GENERATION_PROMPT = `Bạn là một chuyên gia tạo voxel (khối 3D) từ mô tả văn bản.
Nhiệm vụ của bạn: Chuyển đổi mô tả của người dùng thành cấu trúc voxel hợp lệ.

LUẬT:
1. Trả về JSON array các voxel với format: [{"x": số, "y": số, "z": số, "color": "#mã màu"}]
2. Tọa độ x, y, z trong khoảng 0-15 (grid 16x16x16)
3. Y=0 là mặt đất, voxel cao hơn có Y lớn hơn
4. Chọn màu phù hợp từ bảng màu: ${VOXEL_COLORS.join(', ')}
5. Chỉ trả về JSON, không giải thích gì thêm
6. Tạo cấu trúc cân đối, có ý nghĩa
7. Giới hạn: tối đa 200 voxels

Ví dụ:
- Input: "robot đơn giản màu xanh"
- Output: [{"x":7,"y":1,"z":7,"color":"#3b82f6"},...]

Trả lời ngay bây giờ cho: `;

/**
 * Generate voxels from text prompt using MiniMax AI
 */
export async function generateVoxelsFromPrompt({ prompt, gridSize = 16 }) {
  const startTime = Date.now();

  try {
    // Build messages for MiniMax
    const messages = [
      { role: 'system', content: VOXEL_GENERATION_PROMPT },
      { role: 'user', content: prompt }
    ];

    // Call MiniMax API
    const response = await chatWithAI(messages, {
      maxTokens: 2048
    });

    const content = response.content;

    // Parse JSON response
    let voxels;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        voxels = JSON.parse(jsonMatch[0]);
      } else {
        voxels = JSON.parse(content);
      }
    } catch (parseErr) {
      console.error('Failed to parse voxel JSON:', parseErr);
      // Fallback to procedural generation
      return generateFallbackVoxels(prompt, gridSize);
    }

    // Validate voxels
    if (!Array.isArray(voxels) || voxels.length === 0) {
      return {
        voxels: [],
        description: 'Không thể tạo voxel từ mô tả này',
        model: 'MiniMax-M2.5',
        success: false,
        error: 'Invalid voxel data'
      };
    }

    // Filter and normalize voxels to grid bounds
    const validVoxels = voxels
      .filter(v =>
        typeof v.x === 'number' &&
        typeof v.y === 'number' &&
        typeof v.z === 'number' &&
        v.x >= 0 && v.x < gridSize &&
        v.y >= 0 && v.y < gridSize &&
        v.z >= 0 && v.z < gridSize
      )
      .map(v => ({
        x: Math.floor(v.x),
        y: Math.floor(v.y),
        z: Math.floor(v.z),
        color: VOXEL_COLORS.includes(v.color) ? v.color : VOXEL_COLORS[Math.floor(Math.random() * VOXEL_COLORS.length)]
      }));

    return {
      voxels: validVoxels,
      description: `Voxel structure generated from "${prompt}"`,
      model: response.model || 'MiniMax-M2.5',
      success: true,
      generationTimeMs: Date.now() - startTime
    };
  } catch (err) {
    console.error('Voxel AI generation failed:', err);
    return {
      voxels: [],
      description: '',
      model: 'MiniMax-M2.5',
      success: false,
      error: err.message
    };
  }
}

/**
 * Fallback procedural generation for simple shapes
 */
function generateFallbackVoxels(prompt, gridSize) {
  const lowerPrompt = prompt.toLowerCase();
  const center = Math.floor(gridSize / 2);

  // Simple robot
  if (lowerPrompt.includes('robot')) {
    return {
      voxels: [
        // Body
        { x: center - 1, y: 1, z: center, color: '#3b82f6' },
        { x: center, y: 1, z: center, color: '#3b82f6' },
        { x: center - 1, y: 2, z: center, color: '#3b82f6' },
        { x: center, y: 2, z: center, color: '#3b82f6' },
        // Head
        { x: center - 1, y: 3, z: center, color: '#60a5fa' },
        { x: center, y: 3, z: center, color: '#60a5fa' },
        // Eyes
        { x: center - 1, y: 3, z: center - 1, color: '#22c55e' },
        { x: center, y: 3, z: center - 1, color: '#22c55e' },
        // Legs
        { x: center - 1, y: 0, z: center - 1, color: '#1e40af' },
        { x: center, y: 0, z: center - 1, color: '#1e40af' },
      ],
      description: 'Simple robot (procedural)',
      model: 'procedural',
      success: true
    };
  }

  // Tree
  if (lowerPrompt.includes('tree') || lowerPrompt.includes('cây')) {
    return {
      voxels: [
        // Trunk
        { x: center, y: 0, z: center, color: '#8b4513' },
        { x: center, y: 1, z: center, color: '#8b4513' },
        { x: center, y: 2, z: center, color: '#8b4513' },
        // Foliage
        { x: center - 1, y: 3, z: center - 1, color: '#22c55e' },
        { x: center, y: 3, z: center - 1, color: '#22c55e' },
        { x: center - 1, y: 3, z: center, color: '#22c55e' },
        { x: center, y: 3, z: center, color: '#22c55e' },
        { x: center, y: 4, z: center, color: '#16a34a' },
      ],
      description: 'Simple tree (procedural)',
      model: 'procedural',
      success: true
    };
  }

  // House
  if (lowerPrompt.includes('house') || lowerPrompt.includes('nhà')) {
    return {
      voxels: [
        // Foundation
        { x: center - 2, y: 0, z: center - 2, color: '#78716c' },
        { x: center - 1, y: 0, z: center - 2, color: '#78716c' },
        { x: center, y: 0, z: center - 2, color: '#78716c' },
        { x: center + 1, y: 0, z: center - 2, color: '#78716c' },
        // Walls
        { x: center - 2, y: 1, z: center - 2, color: '#f5f5f4' },
        { x: center + 1, y: 1, z: center - 2, color: '#f5f5f4' },
        { x: center - 2, y: 2, z: center - 2, color: '#f5f5f4' },
        { x: center + 1, y: 2, z: center - 2, color: '#f5f5f4' },
        // Door
        { x: center, y: 1, z: center - 2, color: '#8b4513' },
        { x: center, y: 2, z: center - 2, color: '#8b4513' },
        // Roof
        { x: center - 1, y: 3, z: center - 2, color: '#dc2626' },
        { x: center, y: 3, z: center - 2, color: '#dc2626' },
        { x: center + 1, y: 3, z: center - 2, color: '#dc2626' },
      ],
      description: 'Simple house (procedural)',
      model: 'procedural',
      success: true
    };
  }

  // Default: random cubes
  const voxels = [];
  for (let i = 0; i < 20; i++) {
    voxels.push({
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * (gridSize / 2)),
      z: Math.floor(Math.random() * gridSize),
      color: VOXEL_COLORS[Math.floor(Math.random() * VOXEL_COLORS.length)]
    });
  }

  return {
    voxels,
    description: 'Random voxels (procedural fallback)',
    model: 'procedural',
    success: true
  };
}

export default {
  generateVoxelsFromPrompt
};
