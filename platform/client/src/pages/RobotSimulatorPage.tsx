/**
 * RobotSimulatorPage - Combined Blockly IDE + 3D Robot Simulation
 *
 * Provides real-time Blockly code execution with 3D robot visualization.
 * Users program robot with Blockly, then see their code execute in 3D.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Blockly from 'blockly';
import { getBlocksForAgeGroup } from '../components/blocks/index';
import { generateRobotCommands } from '../components/generators/robotGenerator';
import RobotSimulator3D from '../components/simulation/RobotSimulator3D';
import css from '../components/BlocklyIDE.module.css';

// blockly v11 uses different module paths
const Xml = (Blockly as any).Xml || Blockly.Xml;
const domUtils = Xml;

interface RobotCommand {
  type: string;
  params?: Record<string, unknown>;
}

interface RunResult {
  success: boolean;
  message: string;
}

export default function RobotSimulatorPage() {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const initRef = useRef(false);

  const [xml, setXml] = useState('');
  const [commands, setCommands] = useState<RobotCommand[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [showSimulator, setShowSimulator] = useState(true);

  // Initialize Blockly workspace
  useEffect(() => {
    if (!blocklyRef.current || initRef.current) return;
    initRef.current = true;

    const { blockDefinitions, toolboxCategory } = getBlocksForAgeGroup(difficulty);

    const toolbox = {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Logic',
          colour: '#5C81A6',
          contents: [
            { kind: 'block', type: 'controls_if' },
            { kind: 'block', type: 'logic_compare' },
            { kind: 'block', type: 'logic_operation' },
            { kind: 'block', type: 'logic_boolean' }
          ]
        },
        {
          kind: 'category',
          name: 'Loops',
          colour: '#5CA65C',
          contents: [
            { kind: 'block', type: 'controls_repeat_ext' },
            { kind: 'block', type: 'controls_whileUntil' }
          ]
        },
        {
          kind: 'category',
          name: 'Math',
          colour: '#5C68A6',
          contents: [
            { kind: 'block', type: 'math_number' },
            { kind: 'block', type: 'math_arithmetic' },
            { kind: 'block', type: 'math_single' }
          ]
        },
        {
          kind: 'category',
          name: 'Robot',
          colour: '#4CAF50',
          xml: toolboxCategory
        }
      ]
    };

    Blockly.defineBlocksWithJsonArray(blockDefinitions);

    workspaceRef.current = Blockly.inject(blocklyRef.current, {
      toolbox,
      theme: Blockly.Themes.Classic
    });

    workspaceRef.current.addChangeListener((event: any) => {
      if (workspaceRef.current) {
        const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xmlDom);
        setXml(xmlText);
      }
    });

    return () => {
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      initRef.current = false;
    };
  }, [difficulty]);

  // Generate commands from Blockly workspace
  const generateCommands = useCallback((): RobotCommand[] => {
    if (!workspaceRef.current) return [];

    try {
      const jsonStr = generateRobotCommands(workspaceRef.current);
      const parsed: RobotCommand[] = JSON.parse(jsonStr);

      // Expand repeat commands
      const expanded: RobotCommand[] = [];
      for (const cmd of parsed) {
        if (cmd.type === 'repeat') {
          const count = (cmd.params?.count as number) || 1;
          const subCommands = (cmd.params?.commands as RobotCommand[]) || [];
          for (let i = 0; i < count; i++) {
            expanded.push(...subCommands);
          }
        } else {
          expanded.push(cmd);
        }
      }

      return expanded;
    } catch (error) {
      console.error('Failed to generate commands:', error);
      return [];
    }
  }, []);

  // Handle Run button click
  const handleRun = useCallback(() => {
    if (isRunning || !workspaceRef.current) return;

    const cmds = generateCommands();

    if (cmds.length === 0) {
      setRunResult({
        success: false,
        message: 'Không có lệnh nào để chạy! Thêm các khối robot vào workspace.'
      });
      return;
    }

    setCommands(cmds);
    setIsRunning(true);
    setRunResult({
      success: true,
      message: `Đang chạy ${cmds.length} lệnh...`
    });
  }, [isRunning, generateCommands]);

  // Handle Stop button click
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setCommands([]);
    setRunResult(null);
  }, []);

  // Handle command complete
  const handleCommandComplete = useCallback((index: number) => {
    console.log(`Command ${index} completed`);
  }, []);

  // Handle all commands complete
  const handleAllComplete = useCallback(() => {
    setIsRunning(false);
    setRunResult({
      success: true,
      message: 'Hoàn thành tất cả lệnh!'
    });
  }, []);

  // Reset robot position
  const handleReset = useCallback(() => {
    setCommands([]);
    setIsRunning(false);
    setRunResult(null);
  }, []);

  return (
    <div className={css.container} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      <div className={css.toolbar} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px' }}>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={css.runButton}
          style={{
            backgroundColor: isRunning ? '#666' : '#22c55e',
            minWidth: 120
          }}
        >
          {isRunning ? '⏳ Đang chạy...' : '▶ Chạy Robot'}
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={css.runButton}
          style={{
            backgroundColor: isRunning ? '#ef4444' : '#666',
            minWidth: 100
          }}
        >
          ⏹ Dừng
        </button>

        <button
          onClick={handleReset}
          className={css.navButton}
          style={{ minWidth: 100 }}
        >
          🔄 Reset
        </button>

        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className={css.navButton}
        >
          {showSimulator ? '🙈 Ẩn Robot' : '👁️ Hiện Robot'}
        </button>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
          className={css.navButton}
          style={{ minWidth: 120, cursor: 'pointer' }}
        >
          <option value="beginner">🌱 Beginner</option>
          <option value="intermediate">⚡ Intermediate</option>
          <option value="advanced">🔥 Advanced</option>
        </select>

        <div className={css.difficultyIndicator}>
          <span className={css.difficultyLabel}>Độ khó:</span>
          <span className={`${css.difficultyBadge} ${css[difficulty]}`}>
            {difficulty === 'beginner' ? '🌱 Dễ' : difficulty === 'intermediate' ? '⚡ Trung bình' : '🔥 Khó'}
          </span>
        </div>

        {runResult && (
          <span
            className={css.feedback}
            style={{ color: runResult.success ? '#4CAF50' : '#f44336' }}
          >
            {runResult.success ? '✓' : '✕'} {runResult.message}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.history.back()}
            className={css.navButton}
          >
            ← Quay lại
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Blockly IDE */}
        <div
          className={css.blocklyContainer}
          style={{
            width: showSimulator ? '50%' : '100%',
            transition: 'width 0.3s ease'
          }}
        >
          <div ref={blocklyRef} className={css.blockly} />
        </div>

        {/* 3D Robot Simulator */}
        {showSimulator && (
          <div
            style={{
              width: '50%',
              height: '100%',
              position: 'relative',
              borderLeft: '3px solid #333'
            }}
          >
            <RobotSimulator3D
              commands={commands}
              isRunning={isRunning}
              onCommandComplete={handleCommandComplete}
              onAllComplete={handleAllComplete}
              showGrid={true}
            />
          </div>
        )}
      </div>

      {/* Command preview panel */}
      {commands.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'rgba(0,0,0,0.85)',
            padding: 16,
            borderRadius: 12,
            color: 'white',
            maxWidth: 300,
            maxHeight: 200,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: 11,
            border: '1px solid #4CAF50',
            boxShadow: '0 0 20px rgba(76, 175, 80, 0.3)'
          }}
        >
          <div style={{ color: '#4CAF50', marginBottom: 8, fontWeight: 'bold' }}>
            📋 Lệnh đang chạy:
          </div>
          {commands.map((cmd, i) => (
            <div
              key={i}
              style={{
                padding: '4px 8px',
                marginBottom: 4,
                borderRadius: 4,
                background: i < commands.length && isRunning ? 'rgba(255,87,34,0.3)' : 'rgba(76,175,80,0.2)',
                borderLeft: i < commands.length && isRunning ? '3px solid #ff5722' : '3px solid #4CAF50'
              }}
            >
              <span style={{ color: '#aaa' }}>{i + 1}.</span>{' '}
              <span style={{ color: '#4CAF50' }}>{cmd.type}</span>
              {cmd.params && (
                <span style={{ color: '#ffeb3b' }}>
                  {' '}
                  {JSON.stringify(cmd.params)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}