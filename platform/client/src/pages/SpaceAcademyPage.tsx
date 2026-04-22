import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import StarfieldBackground from '../components/space/SpaceBackground';
import SpaceAcademySimulator from '../components/space/SpaceAcademySimulator';
import { XPProgressBar, SpaceLeaderboard, SpaceBadgeGrid } from '../components/gamification';
import { gamificationApi, DEFAULT_LEVELS, Badge } from '../services/gamificationApi';

type TabType = 'simulator' | 'missions' | 'leaderboard' | 'badges';

interface GamificationProfile {
  studentId: string;
  xp: number;
  level: number;
  levelTitle: string;
  levelTitleVi: string;
  badges: Badge[];
  streak: number;
  rank?: number;
}

export default function SpaceAcademyPage() {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');
  const [showWelcome, setShowWelcome] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Load gamification profile
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setIsLoadingProfile(true);
    try {
      const token = localStorage.getItem('robokids_token') || '';
      const data = await gamificationApi.getProfile(token);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Use default values
      setProfile({
        studentId: '',
        xp: 0,
        level: 1,
        levelTitle: 'Space Cadet',
        levelTitleVi: 'Tân binh vũ trụ',
        badges: [],
        streak: 0,
        rank: undefined,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-hidden">
      <StarfieldBackground />

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-br from-[#1a1a2e] to-[#0a0a1a] rounded-3xl p-8 max-w-lg mx-4 border border-cyan-500/30 text-center"
              style={{ boxShadow: '0 0 60px rgba(0, 240, 255, 0.3)' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="text-6xl mb-4"
              >
                🚀
              </motion.div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 bg-clip-text text-transparent mb-4">
                Space Academy
              </h1>
              <p className="text-gray-300 mb-6">
                Chào mừng đến với Space Academy! Học cách lập trình robot trong không gian.
                Hoàn thành các nhiệm vụ để khám phá vũ trụ!
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {['🤖 Lập trình Robot', '🌌 Khám phá vũ trụ', '🎯 Hoàn thành nhiệm vụ', '⭐ Kiếm điểm'].map(
                  (feature, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-300 text-sm"
                    >
                      {feature}
                    </motion.span>
                  )
                )}
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full font-bold text-white hover:scale-105 transition-transform"
                style={{ boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)' }}
              >
                Bắt đầu cuộc phiêu lưu! 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl"
            >
              🛸
            </motion.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Space Academy
            </h1>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            {isLoadingProfile ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
                <span className="text-purple-400">⭐</span>
                <span className="font-bold text-purple-300">Đang tải...</span>
              </div>
            ) : profile ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
                  <span className="text-purple-400">⭐</span>
                  <span className="font-bold text-purple-300">{profile.xp.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-full border border-cyan-500/30">
                  <span className="text-cyan-400">🏆</span>
                  <span className="font-bold text-cyan-300">
                    {profile.rank ? `Hạng #${profile.rank}` : `Cấp ${profile.level}`}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 px-6 py-2"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-gray-700/50">
            {[
              { id: 'simulator', label: '🤖 Simulator', icon: '🤖' },
              { id: 'missions', label: '🎯 Nhiệm vụ', icon: '🎯' },
              { id: 'badges', label: '🏅 Huy hiệu', icon: '🏅' },
              { id: 'leaderboard', label: '🏆 Bảng xếp hạng', icon: '🏆' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
                style={
                  activeTab === tab.id
                    ? { boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'simulator' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-4"
            >
              {/* Simulator */}
              <div className="lg:col-span-3 bg-black/40 backdrop-blur-md rounded-3xl border border-cyan-500/20 overflow-hidden" style={{ height: '600px' }}>
                <SpaceAcademySimulator />
              </div>

              {/* Mission List */}
              <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-orange-500/20 p-4">
                <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                  <span>🎯</span> Nhiệm vụ của bạn
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 1, title: 'First Steps', desc: 'Di chuyển robot về phía trước', difficulty: 'beginner', xp: 50 },
                    { id: 2, title: 'Space Walk', desc: 'Điều khiển robot tham quan không gian', difficulty: 'beginner', xp: 75 },
                    { id: 3, title: 'Asteroid Dodge', desc: 'Né các thiên thạch', difficulty: 'intermediate', xp: 100 },
                  ].map((mission) => (
                    <motion.div
                      key={mission.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-gray-900/80 to-black/80 rounded-xl p-3 border border-gray-700/50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-white font-bold text-sm">{mission.title}</span>
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full
                          ${mission.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                            mission.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'}
                        `}>
                          {mission.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-2">{mission.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-400 text-xs">+{mission.xp} XP</span>
                        <button className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 rounded-lg text-cyan-300 text-xs font-bold">
                          Chơi ngay
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'missions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[
                { id: 1, title: '🚀 First Launch', desc: 'Hoàn thành nhiệm vụ khởi động', difficulty: 'beginner', reward: 100, completed: true },
                { id: 2, title: '🌌 Nebula Explorer', desc: 'Khám phá 3 đám mây nebula khác nhau', difficulty: 'beginner', reward: 150, completed: true },
                { id: 3, title: '🛸 Space Station Visit', desc: 'Ghé thăm trạm vũ trụ', difficulty: 'intermediate', reward: 200, completed: false },
                { id: 4, title: '☄️ Asteroid Belt', desc: 'Điều hướng qua vành đai asteroid', difficulty: 'intermediate', reward: 250, completed: false },
                { id: 5, title: '🌟 Black Hole Escape', desc: 'Thoát khỏi lực hấp dẫn lỗ đen', difficulty: 'advanced', reward: 500, completed: false },
                { id: 6, title: '👽 Alien Contact', desc: 'Liên lạc với người ngoài hành tinh', difficulty: 'advanced', reward: 750, completed: false },
              ].map((mission, i) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className={`
                    relative overflow-hidden rounded-2xl p-5 border
                    ${mission.completed
                      ? 'bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/30'
                      : 'bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-700/50'
                    }
                  `}
                >
                  {mission.completed && (
                    <div className="absolute top-2 right-2 text-2xl">✅</div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`
                      text-xs px-3 py-1 rounded-full font-bold
                      ${mission.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        mission.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'}
                    `}>
                      {mission.difficulty}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{mission.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{mission.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 font-bold">🏆 +{mission.reward} XP</span>
                    <button
                      className={`
                        px-4 py-2 rounded-xl font-bold text-sm transition-all
                        ${mission.completed
                          ? 'bg-green-500/20 text-green-400 cursor-default'
                          : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105'
                        }
                      `}
                      style={!mission.completed ? { boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)' } : {}}
                    >
                      {mission.completed ? 'Đã hoàn thành' : 'Bắt đầu'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <SpaceLeaderboard limit={10} showCurrentUser={true} />
            </motion.div>
          )}

          {activeTab === 'badges' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <SpaceBadgeGrid studentId={profile?.studentId} showAll={true} columns={4} />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}