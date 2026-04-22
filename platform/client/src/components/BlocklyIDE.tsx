import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { useNavigate } from 'react-router-dom';
import { getBlocksForAgeGroup } from './blocks/index';
import { generateRobotCommands } from './generators/robotGenerator';
import ChatPanel from './ChatPanel';
import HintModal from './HintModal';
import { AgeGroup } from '../models/lesson';
import { useAuth } from '../context/AuthContext';
import css from './BlocklyIDE.module.css';

// blockly v11 uses different module paths; use any to bypass type checking
const Xml = (Blockly as any).Xml || Blockly.Xml;
const domUtils = Xml;

interface RunResult {
  success: boolean;
  message: string;
}

interface UserStats {
  xp: number;
  level: number;
  xpInCurrentLevel: number;
  currentStreak: number;
  completedLessons: number;
  completedMissions: number;
}

interface BlocklyIDEProps {
  lessonMode?: boolean;
  starterXml?: string;
  availableBlocks?: string[];
  blockLabelsVi?: Record<string, string>;
  ageGroup?: AgeGroup;
  onXmlChange?: (xml: string) => void;
  lessonId?: string;
}

interface SelectedBlock {
  blockType: string;
  blockId: string;
  fields: Record<string, any>;
}

export default function BlocklyIDE({ lessonMode, starterXml, availableBlocks, blockLabelsVi, ageGroup, onXmlChange, lessonId }: BlocklyIDEProps = {}) {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [xml, setXml] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const initRef = useRef(false);
  const navigate = useNavigate();
  const { token, userAge } = useAuth();

  // Difficulty indicator state
  const [difficulty, setDifficulty] = useState<string>('easy');

  // Fetch user progress stats
  useEffect(() => {
    if (!token) return;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    fetch(`${API_BASE}/api/progress/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUserStats({
          xp: data.xp || 0,
          level: data.level || 1,
          xpInCurrentLevel: data.xpInCurrentLevel || 0,
          currentStreak: data.currentStreak || 0,
          completedLessons: data.completedLessons || 0,
          completedMissions: data.completedMissions || 0
        });
      })
      .catch(() => {
        // Silently fail - stats are not critical
      });
  }, [token]);

  useEffect(() => {
    if (!blocklyRef.current || initRef.current) return;
    initRef.current = true;

    // Get age-group appropriate block definitions
    const { blockDefinitions, toolboxCategory } = getBlocksForAgeGroup(ageGroup || 'beginner');

    // Build robot toolbox — filter by availableBlocks in lesson mode, else show all
    function buildRobotToolbox(): string {
      if (!lessonMode || !availableBlocks?.length) return toolboxCategory;

      // Build XML for each available block, using the age-group toolbox as base
      // We filter the full toolbox XML to only include requested blocks
      const allowed = new Set(availableBlocks);
      const lines = toolboxCategory.split('\n');
      const inCategory = { robot: false, found: false };
      const filtered: string[] = [];

      for (const line of lines) {
        if (line.includes('<category') && line.includes('Robot')) {
          inCategory.robot = true;
          filtered.push(line);
          continue;
        }
        if (inCategory.robot && line.includes('</category>')) {
          inCategory.robot = false;
          filtered.push(line);
          continue;
        }
        if (inCategory.robot) {
          const match = line.match(/<block type="([^"]+)"/);
          if (match && allowed.has(match[1])) {
            filtered.push(line);
          }
        } else {
          filtered.push(line);
        }
      }

      return filtered.join('\n');
    }

    const robotCategoryXml = buildRobotToolbox();

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
          name: 'Text',
          colour: '#5CA68D',
          contents: [
            { kind: 'block', type: 'text' },
            { kind: 'block', type: 'text_join' },
            { kind: 'block', type: 'text_print' }
          ]
        },
        {
          kind: 'category',
          name: 'Robot',
          colour: '#4CAF50',
          xml: robotCategoryXml
        }
      ]
    };

    // Register age-group appropriate robot blocks
    Blockly.defineBlocksWithJsonArray(blockDefinitions);

    workspaceRef.current = Blockly.inject(blocklyRef.current, {
      toolbox,
      theme: Blockly.Themes.Classic
    });

    // Load starter XML if provided (lesson mode)
    if (starterXml && workspaceRef.current) {
      try {
        const dom = domUtils.textToDom(starterXml);
        domUtils.domToWorkspace(dom, workspaceRef.current);
      } catch (e) {
        console.warn('Could not load starter XML:', e);
      }
    }

    // Listen for changes
    workspaceRef.current.addChangeListener((event: any) => {
      if (workspaceRef.current) {
        const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xmlDom);
        setXml(xmlText);
        if (onXmlChange) onXmlChange(xmlText);
      }

      // Track block selection for explain-block feature
      if (event.type === Blockly.Events.SELECTED) {
        const selectedId = event.blockId;
        if (selectedId && workspaceRef.current) {
          const block = workspaceRef.current.getBlockById(selectedId) as any;
          if (block) {
            setSelectedBlock({
              blockType: block.type,
              blockId: selectedId,
              fields: block.fields || {}
            });
          }
        } else {
          setSelectedBlock(null);
        }
      }
    });

    return () => {
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      initRef.current = false;
    };
  }, [lessonMode, starterXml, availableBlocks, blockLabelsVi, ageGroup]);

  const handleRun = async () => {
    if (!workspaceRef.current || isRunning) return;

    setIsRunning(true);
    setRunResult(null);

    try {
      const jsonStr = generateRobotCommands(workspaceRef.current);
      const commands: unknown[] = JSON.parse(jsonStr);

      if (!Array.isArray(commands) || commands.length === 0) {
        setRunResult({ success: false, message: 'Không có lệnh nào để chạy! Thêm các khối robot vào workspace.' });
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
      const token = localStorage.getItem('robokids_token');
      const response = await fetch(`${API_BASE}/api/robots/default/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ commands })
      });

      const data = await response.json();

      if (response.ok) {
        setRunResult({ success: true, message: `Đã chạy ${commands.length} lệnh thành công!` });
      } else {
        setRunResult({ success: false, message: data.error || 'Có lỗi xảy ra khi chạy lệnh.' });
      }
    } catch (error) {
      setRunResult({ success: false, message: 'Không thể kết nối đến server. Đảm bảo server đang chạy.' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={css.container}>
      <div className={css.workspace}>{xml}</div>
      <div className={css.toolbar}>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={css.runButton}
        >
          {isRunning ? '⏳ Đang chạy...' : '▶ Chạy Robot'}
        </button>
        <button
          onClick={() => navigate('/missions')}
          className={css.navButton}
        >
          🎯 Nhiệm vụ
        </button>
        <button
          onClick={() => navigate('/leaderboard')}
          className={css.navButton}
        >
          🏆 Bảng xếp hạng
        </button>
        <button
          onClick={() => navigate('/badges')}
          className={css.navButton}
        >
          🏅 Huy hiệu
        </button>
        <button
          onClick={() => navigate('/curriculum')}
          className={css.navButton}
        >
          📚 Chương trình học
        </button>
        <button
          onClick={() => navigate('/live-classes')}
          className={css.navButton}
        >
          📹 Live Class
        </button>
        <button
          onClick={() => navigate('/challenges')}
          className={css.navButton}
        >
          🏆 Challenge Arena
        </button>
        {userStats && (
          <div className={css.statsDisplay}>
            <span className={css.xpBadge}>⭐ {userStats.xp} XP</span>
            <span className={css.levelBadge}>Lv.{userStats.level}</span>
            <div className={css.xpMiniBar}>
              <div className={css.xpMiniFill} style={{ width: `${userStats.xpInCurrentLevel}%` }} />
            </div>
          </div>
        )}
        <div className={css.difficultyIndicator}>
          <span className={css.difficultyLabel}>Độ khó:</span>
          <span className={`${css.difficultyBadge} ${css[difficulty]}`}>{difficulty === 'easy' ? '🌱 Dễ' : difficulty === 'medium' ? '⚡ Trung bình' : '🔥 Khó'}</span>
        </div>
        <button
          onClick={() => setHintOpen(true)}
          className={css.hintButton}
          title="Nhận gợi ý từ AI"
        >
          💡 Gợi ý
        </button>
        {runResult && (
          <span
            className={css.feedback}
            style={{ color: runResult.success ? '#4CAF50' : '#f44336' }}
          >
            {runResult.success ? '✓' : '✕'} {runResult.message}
          </span>
        )}
      </div>
      <div className={css.blocklyContainer}>
        <div ref={blocklyRef} className={css.blockly} />
      </div>
      <div className={`${css.chatPanel} ${chatOpen ? css.open : ''}`}>
        <ChatPanel blocklyXml={xml} selectedBlock={selectedBlock} userAge={userAge || undefined} />
      </div>
      <HintModal
        isOpen={hintOpen}
        onClose={() => setHintOpen(false)}
        lessonId={lessonId || 'current-lesson'}
        blocklyXml={xml}
        userAge={userAge ?? undefined}
        difficulty={difficulty}
      />
      <button
        className={css.chatToggle}
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="Toggle chat panel"
      >
        {chatOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}
