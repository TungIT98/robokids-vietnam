/**
 * HintModal - AI-powered contextual hint display for Blockly workspace
 * Kid-friendly modal that shows helpful hints when students get stuck.
 */

import { useState, useEffect } from 'react';
import { aiApi } from '../services/api';
import css from './HintModal.module.css';

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  blocklyXml?: string;
  userAge?: number;
  difficulty?: string;
}

interface HintState {
  hint: string;
  difficulty: string;
  level: number;
  maxLevel: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
};

const DIFFICULTY_EMOJIS: Record<string, string> = {
  easy: '🌱',
  medium: '⚡',
  hard: '🔥',
};

export default function HintModal({ isOpen, onClose, lessonId, blocklyXml, userAge, difficulty }: HintModalProps) {
  const [hintState, setHintState] = useState<HintState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lessonId) {
      fetchHint();
    }
  }, [isOpen, lessonId]);

  async function fetchHint() {
    setIsLoading(true);
    setError(null);
    try {
      const context = blocklyXml || '';
      const data = await aiApi.getHint(lessonId, context, undefined, userAge);
      const level = data.difficulty === 'easy' ? 1 : data.difficulty === 'medium' ? 2 : 3;
      setHintState({
        hint: data.hint,
        difficulty: data.difficulty,
        level,
        maxLevel: 3,
      });
    } catch (err) {
      setError('Không thể lấy gợi ý. Thử lại sau nhé!');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const difficultyColor = hintState ? DIFFICULTY_COLORS[hintState.difficulty] || '#4CAF50' : '#4CAF50';
  const difficultyEmoji = hintState ? DIFFICULTY_EMOJIS[hintState.difficulty] || '💡' : '💡';

  return (
    <div className={css.overlay} onClick={onClose}>
      <div className={css.modal} onClick={(e) => e.stopPropagation()}>
        <button className={css.closeButton} onClick={onClose}>✕</button>

        <div className={css.header}>
          <span className={css.headerEmoji}>💡</span>
          <h2 className={css.title}>Gợi ý từ RoboBuddy</h2>
        </div>

        {isLoading && (
          <div className={css.loading}>
            <div className={css.loadingEmoji}>🤖</div>
            <p>Đang tìm gợi ý cho bạn...</p>
          </div>
        )}

        {error && (
          <div className={css.error}>
            <span>{error}</span>
            <button onClick={fetchHint} className={css.retryButton}>🔄 Thử lại</button>
          </div>
        )}

        {!isLoading && hintState && (
          <>
            <div className={css.difficultyBadge} style={{ backgroundColor: difficultyColor + '20', color: difficultyColor }}>
              {difficultyEmoji} Độ khó: {hintState.difficulty}
            </div>

            <div className={css.progressDots}>
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={css.dot}
                  style={{
                    backgroundColor: level <= hintState.level ? difficultyColor : '#e0e0e0',
                  }}
                />
              ))}
            </div>

            <div className={css.hintContent}>
              <p className={css.hintText}>{hintState.hint}</p>
            </div>

            <div className={css.actions}>
              <button onClick={onClose} className={css.gotItButton}>
                ✅ Mình hiểu rồi!
              </button>
              <button onClick={fetchHint} className={css.anotherHintButton}>
                💡 Gợi ý khác
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}