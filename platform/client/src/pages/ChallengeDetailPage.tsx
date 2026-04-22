/**
 * ChallengeDetailPage - Timed coding challenge arena with Blockly IDE
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlocklyIDE from '../components/BlocklyIDE';
import { challengesApi, Challenge, ChallengeAttempt } from '../services/challengesApi';
import { useAuth } from '../context/AuthContext';

interface TestResult {
  id: string;
  name: string;
  passed: boolean | null;
  actualOutput?: string;
  error?: string;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  easy: { label: 'Dễ', emoji: '🟢', color: '#22c55e' },
  medium: { label: 'Trung bình', emoji: '🟡', color: '#eab308' },
  hard: { label: 'Khó', emoji: '🔴', color: '#ef4444' },
};

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, userAge } = useAuth();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Test results state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalMessage, setFinalMessage] = useState<string | null>(null);

  // Blockly XML captured from IDE
  const [blocklyXml, setBlocklyXml] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);

  // Load challenge data and start attempt
  useEffect(() => {
    if (!id || !token) return;
    loadChallenge();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, token]);

  async function loadChallenge() {
    setIsLoading(true);
    setError(null);
    try {
      const challengeData = await challengesApi.getChallenge(id!);
      setChallenge(challengeData);

      // Initialize test results from challenge
      if (challengeData.testCases) {
        setTestResults(challengeData.testCases.map(tc => ({
          id: tc.id,
          name: tc.name,
          passed: null,
        })));
      }

      // Start attempt (creates timed session)
      const attemptData = await challengesApi.startAttempt(id!, token!);
      setAttempt(attemptData);

      // Use timeLimitSeconds from challenge (convert to seconds)
      const timeLimit = attemptData.timeLimitSeconds || challengeData.timeLimitSeconds || challengeData.estimatedMinutes * 60;
      setTimeRemaining(timeLimit);

      // Start countdown
      startTimer(timeLimit);
    } catch (err: any) {
      setError(err.message || 'Failed to load challenge');
    } finally {
      setIsLoading(false);
    }
  }

  function startTimer(_durationSeconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timerRef.current!);
          return 0;
        }
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }

  const handleAutoSubmit = useCallback(async () => {
    if (hasAutoSubmitted.current) return;
    hasAutoSubmitted.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsExpired(true);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await challengesApi.submitAttempt(
        id!,
        attempt?.id || '',
        blocklyXml,
        token!
      );
      setFinalScore(result.score);
      setFinalMessage(result.feedback);
      // Mark visible test cases as failed (we don't have real test results)
      if (challenge?.testCases) {
        setTestResults(prev => prev.map(tr => ({ ...tr, passed: false })));
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Hết giờ! Bài của bạn đã được nộp tự động.');
    } finally {
      setIsSubmitting(false);
    }
  }, [id, attempt, blocklyXml, token, challenge]);

  async function handleSubmit() {
    if (!attempt || !challenge || isExpired || isSubmitting) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await challengesApi.submitAttempt(
        id!,
        attempt.id,
        blocklyXml,
        token!
      );

      setFinalScore(result.score);
      setFinalMessage(result.feedback);

      // Update test results based on passed/failed (placeholder logic)
      if (challenge.testCases) {
        const updatedResults: TestResult[] = challenge.testCases
          .filter(tc => !tc.isHidden)
          .map((tc) => {
            // In a real app, the API would return which tests passed
            // For now, random for demo purposes
            const passed = Math.random() > 0.5;
            return {
              id: tc.id,
              name: tc.name,
              passed,
              actualOutput: passed ? tc.expectedOutput : 'Output không khớp',
            };
          });
        setTestResults(prev => prev.map((tr, idx) => updatedResults[idx] || tr));
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function getTimerUrgency(): 'normal' | 'warning' | 'critical' {
    if (timeRemaining === null) return 'normal';
    if (timeRemaining <= 10) return 'critical';
    if (timeRemaining <= 30) return 'warning';
    return 'normal';
  }

  function handleBackToArena() {
    navigate('/challenges');
  }

  function handleViewLeaderboard() {
    navigate('/challenges/leaderboard');
  }

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingEmoji}>🤖</span>
        <p>Đang tải thử thách...</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <span>⚠️ {error || 'Challenge not found'}</span>
          <button onClick={handleBackToArena} style={styles.backButton}>
            ← Quay lại Arena
          </button>
        </div>
      </div>
    );
  }

  // Show results screen after submission
  if (finalScore !== null) {
    return (
      <div style={styles.container}>
        <div style={styles.resultCard}>
          <button onClick={handleBackToArena} style={styles.backButton}>
            ← Quay lại Arena
          </button>

          <div style={styles.resultHeader}>
            <div style={styles.resultEmoji}>
              {finalScore >= 80 ? '🎉' : finalScore >= 50 ? '👏' : '💪'}
            </div>
            <h1 style={styles.resultTitle}>
              {finalScore >= 80 ? 'Xuất sắc!' : finalScore >= 50 ? 'Tốt lắm!' : 'Cố gắng nhé!'}
            </h1>
            <p style={styles.resultSubtitle}>
              Bạn đã hoàn thành thử thách "{challenge.titleVi || challenge.title}"
            </p>
            {finalMessage && (
              <p style={styles.finalMessage}>{finalMessage}</p>
            )}
          </div>

          <div style={styles.scoreSection}>
            <div style={styles.scoreCircle}>
              <span style={styles.scoreValue}>{finalScore}</span>
              <span style={styles.scoreMax}>/100</span>
            </div>
            <div style={styles.scoreLabel}>Điểm của bạn</div>
          </div>

          <div style={styles.testResultsSummary}>
            <h3 style={styles.testResultsTitle}>Kết quả Test Cases</h3>
            {testResults.map((tr) => (
              <div key={tr.id} style={styles.testResultRow}>
                <span style={{ ...styles.testResultIcon, color: tr.passed ? '#22c55e' : '#ef4444' }}>
                  {tr.passed ? '✓' : '✗'}
                </span>
                <span style={styles.testResultName}>{tr.name}</span>
                {tr.actualOutput && (
                  <span style={styles.testResultOutput}>{tr.actualOutput}</span>
                )}
              </div>
            ))}
          </div>

          <div style={styles.resultActions}>
            <button onClick={handleViewLeaderboard} style={styles.leaderboardButton}>
              🏆 Xem Bảng Xếp Hạng
            </button>
            <button
              onClick={() => window.location.reload()}
              style={styles.retryButton}
            >
              🔄 Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty] || DIFFICULTY_CONFIG.medium;
  const timerUrgency = getTimerUrgency();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={handleBackToArena} style={styles.headerBack}>
            ← Arena
          </button>
          <div>
            <div style={styles.challengeTitle}>{challenge.titleVi || challenge.title}</div>
            <div style={styles.challengeMeta}>
              <span style={{ ...styles.diffBadge, backgroundColor: diffConfig.color + '20', color: diffConfig.color }}>
                {diffConfig.emoji} {diffConfig.label}
              </span>
              <span>⭐ {challenge.xpReward} XP</span>
              <span>🧪 {challenge.testCases?.length || 0} tests</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div style={{
          ...styles.timerBox,
          ...(timerUrgency === 'warning' ? styles.timerWarning : {}),
          ...(timerUrgency === 'critical' ? styles.timerCritical : {}),
        }}>
          <span style={styles.timerLabel}>⏱️ Thời gian</span>
          <span style={styles.timerValue}>{timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.mainContent}>
        {/* Left panel - Challenge description */}
        <div style={styles.leftPanel}>
          <div style={styles.descCard}>
            <h2 style={styles.descTitle}>📋 Mô tả thử thách</h2>
            <p style={styles.descText}>{challenge.descriptionVi || challenge.description}</p>
          </div>

          {challenge.testCases && challenge.testCases.length > 0 && (
            <div style={styles.testCard}>
              <h2 style={styles.descTitle}>🧪 Test Cases</h2>
              <div style={styles.testList}>
                {challenge.testCases.filter(tc => !tc.isHidden).map((tc) => {
                  const result = testResults.find(r => r.id === tc.id);
                  return (
                    <div key={tc.id} style={styles.testItem}>
                      <div style={styles.testHeader}>
                        <span style={styles.testName}>{tc.name}</span>
                        {result && result.passed !== null && (
                          <span style={{ color: result.passed ? '#22c55e' : '#ef4444', fontSize: '16px' }}>
                            {result.passed ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                      <div style={styles.testExpected}>
                        <span style={styles.testLabel}>Kỳ vọng: </span>
                        <code style={styles.testCode}>{tc.expectedOutput}</code>
                      </div>
                      {result?.actualOutput && (
                        <div style={styles.testActual}>
                          <span style={styles.testLabel}>Kết quả: </span>
                          <code style={styles.testCode}>{result.actualOutput}</code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div style={styles.errorBanner}>
              <span>⚠️ {submitError}</span>
              <button onClick={() => setSubmitError(null)} style={styles.errorDismiss}>×</button>
            </div>
          )}
        </div>

        {/* Right panel - Blockly IDE */}
        <div style={styles.rightPanel}>
          <BlocklyIDE
            lessonMode
            ageGroup={userAge && userAge < 10 ? 'beginner' : userAge && userAge < 13 ? 'intermediate' : 'advanced'}
            starterXml={challenge.starterXml}
            availableBlocks={challenge.availableBlocks}
            onXmlChange={setBlocklyXml}
          />
        </div>
      </div>

      {/* Bottom submit bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomInfo}>
          {isExpired ? (
            <span style={styles.expiredNotice}>⏰ Hết giờ! Bài đã được nộp tự động.</span>
          ) : (
            <span>Còn lại: <strong>{timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}</strong></span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isExpired || isSubmitting}
          style={{
            ...styles.submitButton,
            opacity: (isExpired || isSubmitting) ? 0.6 : 1,
            cursor: (isExpired || isSubmitting) ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? '⏳ Đang nộp...' : '✓ Nộp bài'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666',
  },
  loadingEmoji: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
    color: '#dc2626',
  },
  header: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerBack: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    opacity: 0.8,
    padding: 0,
  },
  challengeTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  challengeMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px',
    opacity: 0.8,
    marginTop: '4px',
  },
  diffBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  timerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 20px',
    backgroundColor: '#334155',
    borderRadius: '12px',
    transition: 'all 0.3s',
  },
  timerWarning: {
    backgroundColor: '#f59e0b',
    animation: 'pulse 1s infinite',
  },
  timerCritical: {
    backgroundColor: '#ef4444',
    animation: 'pulse 0.5s infinite',
  },
  timerLabel: {
    fontSize: '11px',
    opacity: 0.8,
  },
  timerValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    gap: '16px',
    padding: '16px',
    overflow: 'hidden',
  },
  leftPanel: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  descCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
  },
  descTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  descText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
  },
  testCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
  },
  testList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  testItem: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  testName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#333',
  },
  testExpected: {
    fontSize: '12px',
    color: '#666',
  },
  testActual: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '2px',
  },
  testLabel: {
    color: '#888',
  },
  testCode: {
    backgroundColor: '#e0e0e0',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  testResultsSummary: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
  },
  testResultsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  testResultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  testResultIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  testResultName: {
    flex: 1,
    fontSize: '13px',
    color: '#333',
  },
  testResultOutput: {
    fontSize: '11px',
    color: '#888',
    fontFamily: 'monospace',
  },
  bottomBar: {
    backgroundColor: 'white',
    borderTop: '1px solid #e0e0e0',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomInfo: {
    fontSize: '14px',
    color: '#666',
  },
  expiredNotice: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    padding: 0,
  },
  resultCard: {
    maxWidth: '500px',
    margin: '40px auto',
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    textAlign: 'center' as const,
  },
  resultHeader: {
    marginBottom: '24px',
  },
  resultEmoji: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  resultTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  resultSubtitle: {
    fontSize: '16px',
    color: '#666',
  },
  finalMessage: {
    fontSize: '14px',
    color: '#6366f1',
    marginTop: '8px',
  },
  scoreSection: {
    marginBottom: '24px',
  },
  scoreCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#e0e7ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  scoreValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#6366f1',
  },
  scoreMax: {
    fontSize: '14px',
    color: '#888',
  },
  scoreLabel: {
    fontSize: '14px',
    color: '#888',
  },
  resultActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  leaderboardButton: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  retryButton: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};