/**
 * Blockly XML Parser for AI Grading
 *
 * Parses Blockly workspace XML into structured analysis format
 * for AI-powered code optimization analysis (Big O notation).
 */

import type { RobotCommand } from '../components/generators/robotGenerator';

// ============================================
// Types
// ============================================

export interface ParsedBlock {
  id: string;
  type: string;
  fields: Record<string, string | number>;
  inputs: Record<string, ParsedBlock[]>;
  next?: ParsedBlock;
}

export interface BlockMetrics {
  /** Total number of blocks */
  totalBlocks: number;
  /** Total number of commands (leaf nodes) */
  totalCommands: number;
  /** Maximum nesting depth */
  maxDepth: number;
  /** Number of loops (repeat blocks) */
  loopCount: number;
  /** Number of conditional blocks (if_sensor) */
  conditionalCount: number;
  /** Number of sensor reads */
  sensorReads: number;
  /** Estimated worst-case command count */
  estimatedCommands: number;
}

export interface BlocklyAnalysis {
  /** Original block count */
  blockCount: number;
  /** Metrics computed from blocks */
  metrics: BlockMetrics;
  /** Command sequence as flat array */
  commandSequence: string[];
  /** Hierarchical block tree */
  blockTree: ParsedBlock | null;
  /** Estimated time complexity */
  timeComplexity: string;
  /** Estimated space complexity */
  spaceComplexity: string;
  /** Summary description */
  summary: string;
  /** Optimization suggestions */
  suggestions: string[];
}

// ============================================
// XML Parsing
// ============================================

/**
 * Parse a Blockly XML string into a block tree
 */
export function parseBlocklyXML(xmlString: string): ParsedBlock | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const blockElement = doc.querySelector('block');
    if (!blockElement) return null;

    return parseBlockElement(blockElement);
  } catch (error) {
    console.error('Failed to parse Blockly XML:', error);
    return null;
  }
}

/**
 * Recursively parse a block XML element into a ParsedBlock
 */
function parseBlockElement(element: Element): ParsedBlock {
  const id = element.getAttribute('id') || generateId();
  const type = element.getAttribute('type') || 'unknown';

  // Parse fields
  const fields: Record<string, string | number> = {};
  element.querySelectorAll('field').forEach((field) => {
    const name = field.getAttribute('name');
    const value = field.textContent || '';
    if (name) {
      // Convert numeric strings to numbers
      fields[name] = isNumeric(value) ? parseFloat(value) : value;
    }
  });

  // Parse value inputs (nested blocks)
  const inputs: Record<string, ParsedBlock[]> = {};
  element.querySelectorAll('value').forEach((value) => {
    const name = value.getAttribute('name');
    const block = value.querySelector('block');
    if (name && block) {
      inputs[name] = [parseBlockElement(block)];
    }
  });

  // Parse statement inputs (child blocks like repeat DO)
  element.querySelectorAll('statement').forEach((statement) => {
    const name = statement.getAttribute('name');
    const block = statement.querySelector('block');
    if (name && block) {
      // Parse the chain of blocks
      inputs[name] = parseBlockChain(block);
    }
  });

  // Parse next block
  let next: ParsedBlock | undefined;
  const nextElement = element.querySelector('next > block');
  if (nextElement) {
    next = parseBlockElement(nextElement);
  }

  return { id, type, fields, inputs, next };
}

/**
 * Parse a chain of connected blocks
 */
function parseBlockChain(firstBlock: Element): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let current: Element | null = firstBlock;

  while (current) {
    blocks.push(parseBlockElement(current));
    const nextElement: Element | null = current.querySelector(':scope > next > block');
    current = nextElement;
  }

  return blocks;
}

// ============================================
// Metrics Calculation
// ============================================

/**
 * Calculate metrics from parsed blocks
 */
export function calculateBlockMetrics(root: ParsedBlock | null): BlockMetrics {
  if (!root) {
    return {
      totalBlocks: 0,
      totalCommands: 0,
      maxDepth: 0,
      loopCount: 0,
      conditionalCount: 0,
      sensorReads: 0,
      estimatedCommands: 0,
    };
  }

  let totalBlocks = 0;
  let totalCommands = 0;
  let maxDepth = 0;
  let loopCount = 0;
  let conditionalCount = 0;
  let sensorReads = 0;

  function traverse(block: ParsedBlock, depth: number) {
    totalBlocks++;
    maxDepth = Math.max(maxDepth, depth);

    // Check block type
    if (block.type === 'robot_repeat') {
      loopCount++;
      // Count commands inside the loop
      const loopBody = block.inputs['DO'] || [];
      loopBody.forEach((b) => {
        const innerMetrics = countCommandsInTree(b);
        totalCommands += innerMetrics.commands * (block.fields['COUNT'] as number || 1);
      });
    } else if (block.type === 'robot_if_sensor') {
      conditionalCount++;
      const thenBody = block.inputs['THEN'] || [];
      thenBody.forEach((b) => {
        totalCommands += countCommandsInTree(b).commands;
      });
    } else if (isSensorBlock(block.type)) {
      sensorReads++;
      totalCommands++;
    } else if (isCommandBlock(block.type)) {
      totalCommands++;
    }

    // Traverse nested blocks
    Object.values(block.inputs).forEach((nestedBlocks) => {
      nestedBlocks.forEach((b) => traverse(b, depth + 1));
    });

    // Traverse next block
    if (block.next) {
      traverse(block.next, depth);
    }
  }

  traverse(root, 0);

  return {
    totalBlocks,
    totalCommands,
    maxDepth,
    loopCount,
    conditionalCount,
    sensorReads,
    estimatedCommands: totalCommands,
  };
}

/**
 * Count commands in a tree structure
 */
function countCommandsInTree(block: ParsedBlock): { commands: number } {
  let commands = 0;

  function traverse(b: ParsedBlock) {
    if (isCommandBlock(b.type) || isSensorBlock(b.type)) {
      commands++;
    }
    if (b.next) traverse(b.next);
    Object.values(b.inputs).forEach((nested) => nested.forEach(traverse));
  }

  traverse(block);
  return { commands };
}

// ============================================
// Command Sequence Extraction
// ============================================

/**
 * Extract flat command sequence from parsed blocks
 */
export function extractCommandSequence(root: ParsedBlock | null): string[] {
  if (!root) return [];

  const commands: string[] = [];

  function traverse(block: ParsedBlock) {
    if (isCommandBlock(block.type)) {
      commands.push(blockToCommand(block));
    }

    // Handle loops - expand them
    if (block.type === 'robot_repeat') {
      const count = (block.fields['COUNT'] as number) || 1;
      const loopBody = block.inputs['DO'] || [];
      for (let i = 0; i < count; i++) {
        loopBody.forEach((b) => {
          extractCommandsRecursive(b, commands);
        });
      }
    } else if (block.type === 'robot_if_sensor') {
      const thenBody = block.inputs['THEN'] || [];
      thenBody.forEach((b) => {
        extractCommandsRecursive(b, commands);
      });
    } else {
      // Sensor blocks
      if (isSensorBlock(block.type)) {
        commands.push(blockToCommand(block));
      }
    }

    // Next block
    if (block.next) {
      traverse(block.next);
    }
  }

  function extractCommandsRecursive(b: ParsedBlock, cmds: string[]) {
    if (isCommandBlock(b.type)) {
      cmds.push(blockToCommand(b));
    }
    if (b.next) extractCommandsRecursive(b.next, cmds);
    Object.values(b.inputs).forEach((nested) => nested.forEach((nb) => extractCommandsRecursive(nb, cmds)));
  }

  traverse(root);
  return commands;
}

/**
 * Convert a parsed block to a command string
 */
function blockToCommand(block: ParsedBlock): string {
  switch (block.type) {
    case 'robot_move_forward':
      return `move_forward(${block.fields['STEPS'] || 0})`;
    case 'robot_move_backward':
      return `move_backward(${block.fields['STEPS'] || 0})`;
    case 'robot_turn_left':
      return `turn_left(${block.fields['DEGREES'] || 0})`;
    case 'robot_turn_right':
      return `turn_right(${block.fields['DEGREES'] || 0})`;
    case 'robot_wait':
      return `wait(${block.fields['SECONDS'] || 1}s)`;
    case 'robot_set_speed':
      return `set_speed(${block.fields['SPEED'] || 50})`;
    case 'robot_play_note':
      return `play_note(${block.fields['FREQUENCY'] || 440}Hz)`;
    case 'robot_led_on':
      return 'led_on()';
    case 'robot_led_off':
      return 'led_off()';
    case 'robot_get_distance':
      return 'get_distance()';
    case 'robot_get_light_level':
      return 'get_light_level()';
    case 'robot_camera_light_sensor':
      return `get_camera_light(${block.fields['DIRECTION'] || 'FORWARD'})`;
    case 'robot_line_tracker':
      return 'line_tracker()';
    default:
      return `${block.type}()`;
  }
}

// ============================================
// Complexity Analysis
// ============================================

/**
 * Estimate time complexity (Big O notation)
 */
export function estimateTimeComplexity(metrics: BlockMetrics): string {
  if (metrics.loopCount === 0 && metrics.conditionalCount === 0) {
    return 'O(n)'; // Linear - just sequential commands
  }

  if (metrics.loopCount === 1 && metrics.maxDepth <= 1) {
    return 'O(n)'; // Single loop - still linear
  }

  if (metrics.loopCount > 1 || metrics.maxDepth > 2) {
    return 'O(n²)'; // Nested loops - quadratic
  }

  return 'O(n)';
}

/**
 * Estimate space complexity
 */
export function estimateSpaceComplexity(metrics: BlockMetrics): string {
  if (metrics.maxDepth > 2) {
    return 'O(n)'; // Recursive/stacked calls
  }
  return 'O(1)'; // Constant space
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * Analyze Blockly XML and return structured analysis
 */
export function analyzeBlocklyCode(xmlString: string): BlocklyAnalysis {
  const blockTree = parseBlocklyXML(xmlString);
  const metrics = calculateBlockMetrics(blockTree);
  const commandSequence = extractCommandSequence(blockTree);
  const timeComplexity = estimateTimeComplexity(metrics);
  const spaceComplexity = estimateSpaceComplexity(metrics);

  // Generate suggestions
  const suggestions: string[] = [];

  if (metrics.loopCount > 0) {
    suggestions.push('Loop optimization: Consider combining repeated patterns into a single loop.');
  }

  if (metrics.totalCommands > 20) {
    suggestions.push('Code length: Your program has many commands. Try to simplify the logic.');
  }

  if (metrics.maxDepth > 3) {
    suggestions.push('Nesting: Deep nesting detected. Consider flattening the logic for readability.');
  }

  if (metrics.sensorReads === 0) {
    suggestions.push('Sensors: No sensor inputs detected. Using sensors can make your code more efficient.');
  }

  if (metrics.conditionalCount === 0 && metrics.sensorReads > 0) {
    suggestions.push('Conditionals: You read sensors but don\'t use conditions. Consider adding if_sensor blocks.');
  }

  // Generate summary
  const summary = generateSummary(metrics, timeComplexity, spaceComplexity);

  return {
    blockCount: metrics.totalBlocks,
    metrics,
    commandSequence,
    blockTree,
    timeComplexity,
    spaceComplexity,
    summary,
    suggestions,
  };
}

// ============================================
// Helpers
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function isNumeric(value: string): boolean {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}

function isCommandBlock(type: string): boolean {
  return [
    'robot_move_forward',
    'robot_move_backward',
    'robot_turn_left',
    'robot_turn_right',
    'robot_wait',
    'robot_set_speed',
    'robot_play_note',
    'robot_led_on',
    'robot_led_off',
  ].includes(type);
}

function isSensorBlock(type: string): boolean {
  return [
    'robot_get_distance',
    'robot_get_light_level',
    'robot_camera_light_sensor',
    'robot_line_tracker',
  ].includes(type);
}

function generateSummary(
  metrics: BlockMetrics,
  timeComplexity: string,
  spaceComplexity: string
): string {
  const parts: string[] = [];

  parts.push(`Total blocks: ${metrics.totalBlocks}`);
  parts.push(`Total commands: ${metrics.totalCommands}`);

  if (metrics.loopCount > 0) {
    parts.push(`Loops: ${metrics.loopCount}`);
  }

  if (metrics.conditionalCount > 0) {
    parts.push(`Conditionals: ${metrics.conditionalCount}`);
  }

  if (metrics.sensorReads > 0) {
    parts.push(`Sensor reads: ${metrics.sensorReads}`);
  }

  parts.push(`Complexity: Time ${timeComplexity}, Space ${spaceComplexity}`);

  return parts.join(' | ');
}

// ============================================
// AI Integration
// ============================================

export interface AIOptimizationRequest {
  analysis: BlocklyAnalysis;
  lessonId?: string;
  userId?: string;
}

/**
 * Format analysis for AI consumption
 * This creates a prompt-friendly representation
 */
export function formatForAI(request: AIOptimizationRequest): string {
  const { analysis, lessonId, userId } = request;

  const lines = [
    '# Blockly Code Analysis',
    '',
    '## Metrics',
    `- Block Count: ${analysis.blockCount}`,
    `- Total Commands: ${analysis.metrics.totalCommands}`,
    `- Loops: ${analysis.metrics.loopCount}`,
    `- Conditionals: ${analysis.metrics.conditionalCount}`,
    `- Sensor Reads: ${analysis.metrics.sensorReads}`,
    `- Max Depth: ${analysis.metrics.maxDepth}`,
    '',
    '## Command Sequence',
    ...analysis.commandSequence.map((cmd, i) => `  ${i + 1}. ${cmd}`),
    '',
    '## Complexity',
    `- Time: ${analysis.timeComplexity}`,
    `- Space: ${analysis.spaceComplexity}`,
    '',
    '## Suggestions',
    ...analysis.suggestions.map((s) => `- ${s}`),
  ];

  if (lessonId) {
    lines.unshift(`## Context\nLesson ID: ${lessonId}`);
  }

  return lines.join('\n');
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface AIOptimizationResult {
  passed: boolean;
  feedback: string;
  optimizationScore: number; // 0-100
  bigO: {
    time: string;
    space: string;
  };
  suggestions: string[];
  xpBonus: number;
}

/**
 * POST /api/ai/blockly-optimization
 * AI analyzes parsed Blockly code and returns optimization suggestions
 * with Big O notation analysis.
 */
export async function analyzeBlocklyWithAI(
  analysis: BlocklyAnalysis,
  options: { lessonId?: string; userId?: string } = {}
): Promise<AIOptimizationResult> {
  const response = await fetch(`${API_BASE}/api/ai/blockly-optimization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysis,
      lessonId: options.lessonId,
      userId: options.userId,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `AI optimization failed: ${response.status}`);
  }

  return response.json();
}