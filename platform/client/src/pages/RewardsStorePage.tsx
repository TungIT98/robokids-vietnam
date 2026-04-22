/**
 * RewardsStorePage - Spend XP on avatars, themes, badge frames, animations, and titles
 * Kid-friendly UI with colorful design and emojis
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pocketbase, isPocketBaseConfigured } from '../services/pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

// Store item categories
export type StoreCategory = 'avatars' | 'themes' | 'badge_frames' | 'animations' | 'titles';

export interface StoreItem {
  id: string;
  key: string;
  category: StoreCategory;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  iconEmoji: string;
  iconUrl?: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isOwned: boolean;
  isLimited?: boolean;
  limitedStock?: number;
  expiresAt?: string;
}

// Default store inventory
const DEFAULT_STORE_ITEMS: Omit<StoreItem, 'id' | 'isOwned'>[] = [
  // AVATARS
  {
    key: 'avatar_robot_1',
    category: 'avatars',
    name: 'Cute Robot',
    nameVi: 'Robot dễ thương',
    description: 'A friendly robot companion',
    descriptionVi: 'Một robot bạn đồng hành dễ thương',
    iconEmoji: '🤖',
    price: 100,
    rarity: 'common',
  },
  {
    key: 'avatar_rocket',
    category: 'avatars',
    name: 'Rocket Ship',
    nameVi: 'Tên lửa',
    description: 'Blast off to space!',
    descriptionVi: 'Phóng lên không gian!',
    iconEmoji: '🚀',
    price: 150,
    rarity: 'uncommon',
  },
  {
    key: 'avatar_astronaut',
    category: 'avatars',
    name: 'Astronaut',
    nameVi: 'Phi hành gia',
    description: 'Explore the universe',
    descriptionVi: 'Khám phá vũ trụ',
    iconEmoji: '👨‍🚀',
    price: 300,
    rarity: 'rare',
  },
  {
    key: 'avatar_dragon',
    category: 'avatars',
    name: 'Space Dragon',
    nameVi: 'Rồng vũ trụ',
    description: 'A mythical space creature',
    descriptionVi: 'Một sinh vật vũ trụ thần thoại',
    iconEmoji: '🐉',
    price: 500,
    rarity: 'epic',
  },
  {
    key: 'avatar_alien',
    category: 'avatars',
    name: 'Alien Friend',
    nameVi: 'Người ngoài hành tinh',
    description: 'A friendly alien from far away',
    descriptionVi: 'Một người ngoài hành tinh từ xa',
    iconEmoji: '👽',
    price: 200,
    rarity: 'common',
  },
  {
    key: 'avatar_ufo',
    category: 'avatars',
    name: 'Flying Saucer',
    nameVi: 'Đĩa bay',
    description: 'Zoom zoom across the stars',
    descriptionVi: 'Lướt qua các vì sao',
    iconEmoji: '🛸',
    price: 250,
    rarity: 'uncommon',
  },
  {
    key: 'avatar_star',
    category: 'avatars',
    name: 'Star Pilot',
    nameVi: 'Phi công sao',
    description: 'Navigate the galaxy',
    descriptionVi: 'Điều khiển thiên hà',
    iconEmoji: '⭐',
    price: 400,
    rarity: 'rare',
  },
  {
    key: 'avatar_galaxy',
    category: 'avatars',
    name: 'Galaxy Master',
    nameVi: 'Chúa tể thiên hà',
    description: 'Master of the cosmos',
    descriptionVi: 'Chủ nhân vũ trụ',
    iconEmoji: '🌌',
    price: 750,
    rarity: 'legendary',
  },

  // THEMES
  {
    key: 'theme_space_blue',
    category: 'themes',
    name: 'Space Blue',
    nameVi: 'Xanh không gian',
    description: 'Deep space adventure',
    descriptionVi: 'Cuộc phiêu lưu không gian sâu thẳm',
    iconEmoji: '🌌',
    price: 200,
    rarity: 'common',
  },
  {
    key: 'theme_neon',
    category: 'themes',
    name: 'Neon City',
    nameVi: 'Thành phố neon',
    description: 'Cyberpunk vibes',
    descriptionVi: 'Phong cách cyberpunk',
    iconEmoji: '🌃',
    price: 300,
    rarity: 'uncommon',
  },
  {
    key: 'theme_sunset',
    category: 'themes',
    name: 'Robot Sunset',
    nameVi: 'Hoàng hôn robot',
    description: 'Warm sunset colors',
    descriptionVi: 'Màu sắc hoàng hôn ấm áp',
    iconEmoji: '🌅',
    price: 350,
    rarity: 'rare',
  },
  {
    key: 'theme_galaxy',
    category: 'themes',
    name: 'Galaxy Dreams',
    nameVi: 'Giấc mơ thiên hà',
    description: 'Stars and nebulae',
    descriptionVi: 'Sao và tinh vân',
    iconEmoji: '✨',
    price: 500,
    rarity: 'epic',
  },
  {
    key: 'theme_aurora',
    category: 'themes',
    name: 'Aurora Borealis',
    nameVi: 'Cực quang',
    description: 'Northern lights magic',
    descriptionVi: 'Phép thuật cực quang',
    iconEmoji: '🌌',
    price: 600,
    rarity: 'legendary',
  },

  // BADGE FRAMES
  {
    key: 'frame_glow',
    category: 'badge_frames',
    name: 'Glowing Frame',
    nameVi: 'Khung sáng',
    description: 'Your badges will glow!',
    descriptionVi: 'Huy hiệu của bạn sẽ phát sáng!',
    iconEmoji: '💫',
    price: 150,
    rarity: 'common',
  },
  {
    key: 'frame_gold',
    category: 'badge_frames',
    name: 'Gold Frame',
    nameVi: 'Khung vàng',
    description: 'Premium golden border',
    descriptionVi: 'Viền vàng cao cấp',
    iconEmoji: '🥇',
    price: 400,
    rarity: 'rare',
  },
  {
    key: 'frame_diamond',
    category: 'badge_frames',
    name: 'Diamond Frame',
    nameVi: 'Khung kim cương',
    description: 'Shiniest frame ever',
    descriptionVi: 'Khung lấp lánh nhất',
    iconEmoji: '💎',
    price: 800,
    rarity: 'legendary',
  },
  {
    key: 'frame_star',
    category: 'badge_frames',
    name: 'Star Frame',
    nameVi: 'Khung sao',
    description: 'Stars around your badges',
    descriptionVi: 'Sao bay quanh huy hiệu',
    iconEmoji: '⭐',
    price: 250,
    rarity: 'uncommon',
  },
  {
    key: 'frame_fire',
    category: 'badge_frames',
    name: 'Fire Frame',
    nameVi: 'Khung lửa',
    description: 'Hot fiery border',
    descriptionVi: 'Viền lửa nóng bỏng',
    iconEmoji: '🔥',
    price: 350,
    rarity: 'epic',
  },

  // ANIMATIONS
  {
    key: 'anim_sparkle',
    category: 'animations',
    name: 'Sparkle Trail',
    nameVi: 'Vệt lấp lánh',
    description: 'Sparkles follow you',
    descriptionVi: 'Những tia lấp lánh theo bạn',
    iconEmoji: '✨',
    price: 200,
    rarity: 'common',
  },
  {
    key: 'anim_rocket',
    category: 'animations',
    name: 'Rocket Boost',
    nameVi: 'Tên lửa bay',
    description: 'Rocket flames on your avatar',
    descriptionVi: 'Ngọn lửa tên lửa trên hình đại diện',
    iconEmoji: '🔥',
    price: 350,
    rarity: 'rare',
  },
  {
    key: 'anim_galaxy',
    category: 'animations',
    name: 'Galaxy Swirl',
    nameVi: 'Xoáy thiên hà',
    description: 'Space swirls around you',
    descriptionVi: 'Vũ trụ xoay quanh bạn',
    iconEmoji: '🌌',
    price: 500,
    rarity: 'epic',
  },
  {
    key: 'anim_rainbow',
    category: 'animations',
    name: 'Rainbow Aura',
    nameVi: 'Hào quang cầu vồng',
    description: 'Colorful rainbow aura',
    descriptionVi: 'Hào quang cầu vồng nhiều màu',
    iconEmoji: '🌈',
    price: 450,
    rarity: 'epic',
  },

  // TITLES
  {
    key: 'title_rookie',
    category: 'titles',
    name: 'Rookie',
    nameVi: 'Tân binh',
    description: 'Just getting started',
    descriptionVi: 'Mới bắt đầu',
    iconEmoji: '🌱',
    price: 0,
    rarity: 'common',
  },
  {
    key: 'title_explorer',
    category: 'titles',
    name: 'Explorer',
    nameVi: 'Khám phá',
    description: 'Discovering new things',
    descriptionVi: 'Khám phá những điều mới',
    iconEmoji: '🔭',
    price: 100,
    rarity: 'common',
  },
  {
    key: 'title_builder',
    category: 'titles',
    name: 'Builder',
    nameVi: 'Người xây',
    description: 'Building the future',
    descriptionVi: 'Xây dựng tương lai',
    iconEmoji: '🛠️',
    price: 200,
    rarity: 'uncommon',
  },
  {
    key: 'title_champion',
    category: 'titles',
    name: 'Champion',
    nameVi: 'Vô địch',
    description: 'Top performer',
    descriptionVi: 'Người dẫn đầu',
    iconEmoji: '🏆',
    price: 500,
    rarity: 'rare',
  },
  {
    key: 'title_legend',
    category: 'titles',
    name: 'Legend',
    nameVi: 'Huyền thoại',
    description: 'A true legend',
    descriptionVi: 'Một huyền thoại thực thụ',
    iconEmoji: '👑',
    price: 1000,
    rarity: 'legendary',
  },
];

const CATEGORY_INFO: Record<StoreCategory, { name: string; nameVi: string; icon: string; color: string }> = {
  avatars: { name: 'Avatars', nameVi: 'Hình đại diện', icon: '🤖', color: '#6366f1' },
  themes: { name: 'Themes', nameVi: 'Giao diện', icon: '🎨', color: '#ec4899' },
  badge_frames: { name: 'Badge Frames', nameVi: 'Khung huy hiệu', icon: '🏅', color: '#f59e0b' },
  animations: { name: 'Animations', nameVi: 'Hiệu ứng', icon: '✨', color: '#22c55e' },
  titles: { name: 'Titles', nameVi: 'Danh hiệu', icon: '⭐', color: '#a855f7' },
};

const RARITY_COLORS: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

interface UserXP {
  xp: number;
  ownedItems: string[];
  equippedItems: {
    avatar?: string;
    theme?: string;
    badgeFrame?: string;
    animation?: string;
    title?: string;
  };
}

export default function RewardsStorePage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory>('avatars');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadStoreData();
  }, [token, navigate]);

  async function loadStoreData() {
    setIsLoading(true);
    setError(null);
    try {
      // Load store items
      const storeItems = DEFAULT_STORE_ITEMS.map((item, idx) => ({
        ...item,
        id: `store-${idx}`,
        isOwned: false,
      }));

      // Load user XP and owned items from PocketBase
      if (isPocketBaseConfigured() && pocketbase) {
        const userId = pocketbase.authStore.model?.id;
        if (userId) {
          // Get user XP record
          let xpRecord: any = null;
          try {
            xpRecord = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + userId + "'");
          } catch (e: any) {
            if (e.status !== 404) throw e;
          }

          // Get owned items
          let ownedItems: string[] = [];
          try {
            const result = await pocketbase.collection('user_store_items').getList(1, 100, {
              filter: "user_id='" + userId + "'",
            });
            ownedItems = result.items.map((item: any) => item.item_key);
          } catch (e: any) {
            if (e.status !== 404) throw e;
          }

          // Get equipped items
          let equippedItems = { avatar: undefined, theme: undefined, badgeFrame: undefined, animation: undefined, title: undefined };
          try {
            const equipRecord = await pocketbase.collection('user_equipped_items').getFirstListItem("user_id='" + userId + "'");
            equippedItems = {
              avatar: equipRecord.avatar_key,
              theme: equipRecord.theme_key,
              badgeFrame: equipRecord.badge_frame_key,
              animation: equipRecord.animation_key,
              title: equipRecord.title_key,
            };
          } catch (e: any) {
            if (e.status !== 404) throw e;
          }

          setUserXP({
            xp: xpRecord?.xp || 0,
            ownedItems,
            equippedItems,
          });

          // Mark owned items
          storeItems.forEach(item => {
            if (ownedItems.includes(item.key)) {
              item.isOwned = true;
            }
          });
        }
      } else {
        // Fallback mock data
        setUserXP({
          xp: 1250,
          ownedItems: ['avatar_robot_1', 'title_rookie'],
          equippedItems: { avatar: 'avatar_robot_1', title: 'title_rookie' },
        });
        storeItems.forEach(item => {
          if (['avatar_robot_1', 'title_rookie'].includes(item.key)) {
            item.isOwned = true;
          }
        });
      }

      setItems(storeItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store');
    } finally {
      setIsLoading(false);
    }
  }

  async function purchaseItem(item: StoreItem) {
    if (!userXP || item.isOwned || userXP.xp < item.price) return;

    setPurchasingId(item.id);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      if (isPocketBaseConfigured() && pocketbase) {
        const userId = pocketbase.authStore.model?.id;
        if (!userId) throw new Error('Not authenticated');

        // Deduct XP
        let xpRecord: any = null;
        try {
          xpRecord = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + userId + "'");
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }

        if (xpRecord?.id) {
          await pocketbase.collection('user_xp').update(xpRecord.id, {
            xp: xpRecord.xp - item.price,
          });
        }

        // Add to owned items
        await pocketbase.collection('user_store_items').create({
          user_id: userId,
          item_key: item.key,
          category: item.category,
          purchased_at: new Date().toISOString(),
        });

        // Update local state
        setUserXP(prev => prev ? {
          ...prev,
          xp: prev.xp - item.price,
          ownedItems: [...prev.ownedItems, item.key],
        } : null);

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isOwned: true } : i));
        setPurchaseSuccess(`Đã mua ${item.nameVi}!`);
      } else {
        // Mock purchase
        setUserXP(prev => prev ? {
          ...prev,
          xp: prev.xp - item.price,
          ownedItems: [...prev.ownedItems, item.key],
        } : null);

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isOwned: true } : i));
        setPurchaseSuccess(`Đã mua ${item.nameVi}!`);
      }

      // Clear success message after 3s
      setTimeout(() => setPurchaseSuccess(null), 3000);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed');
      setTimeout(() => setPurchaseError(null), 3000);
    } finally {
      setPurchasingId(null);
    }
  }

  async function equipItem(item: StoreItem) {
    if (!item.isOwned || !userXP) return;

    try {
      if (isPocketBaseConfigured() && pocketbase) {
        const userId = pocketbase.authStore.model?.id;
        if (!userId) throw new Error('Not authenticated');

        const fieldMap: Record<StoreCategory, string> = {
          avatars: 'avatar_key',
          themes: 'theme_key',
          badge_frames: 'badge_frame_key',
          animations: 'animation_key',
          titles: 'title_key',
        };

        const field = fieldMap[item.category];

        // Check if equip record exists
        try {
          await pocketbase.collection('user_equipped_items').getFirstListItem("user_id='" + userId + "'");
          // Update existing
          await pocketbase.collection('user_equipped_items').update(userId, {
            [field]: item.key,
          });
        } catch (e: any) {
          if (e.status === 404) {
            // Create new
            await pocketbase.collection('user_equipped_items').create({
              user_id: userId,
              [field]: item.key,
            });
          } else {
            throw e;
          }
        }

        setUserXP(prev => prev ? {
          ...prev,
          equippedItems: {
            ...prev.equippedItems,
            [field === 'avatar_key' ? 'avatar' : field === 'theme_key' ? 'theme' : field === 'badge_frame_key' ? 'badgeFrame' : field === 'animation_key' ? 'animation' : 'title']: item.key,
          },
        } : null);
      } else {
        // Mock equip
        const fieldKey = item.category === 'avatars' ? 'avatar' : item.category === 'themes' ? 'theme' : item.category === 'badge_frames' ? 'badgeFrame' : item.category === 'animations' ? 'animation' : 'title';
        setUserXP(prev => prev ? {
          ...prev,
          equippedItems: {
            ...prev.equippedItems,
            [fieldKey]: item.key,
          },
        } : null);
      }
    } catch (err) {
      console.error('Failed to equip item:', err);
    }
  }

  const filteredItems = items.filter(item => item.category === selectedCategory);
  const categoryInfo = CATEGORY_INFO[selectedCategory];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '24px 16px',
      minHeight: '100vh',
      backgroundColor: '#0f0f23',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px',
    },
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    backBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    title: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#fff',
      margin: 0,
    },
    xpDisplay: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 20px',
      backgroundColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: '12px',
      border: '1px solid rgba(168, 85, 247, 0.4)',
    },
    xpIcon: {
      fontSize: '24px',
    },
    xpAmount: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#a855f7',
    },
    xpLabel: {
      fontSize: '14px',
      color: '#a0a0ff',
    },
    categoryTabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      flexWrap: 'wrap',
    },
    categoryTab: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 18px',
      borderRadius: '12px',
      border: '2px solid transparent',
      backgroundColor: 'rgba(255,255,255,0.05)',
      color: '#a0a0ff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s',
    },
    categoryTabActive: {
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: '#6366f1',
      color: '#fff',
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px',
    },
    itemCard: {
      backgroundColor: 'rgba(30, 30, 60, 0.8)',
      borderRadius: '16px',
      padding: '20px',
      border: '2px solid rgba(100, 100, 255, 0.2)',
      textAlign: 'center' as const,
      transition: 'all 0.2s',
      position: 'relative' as const,
    },
    itemCardOwned: {
      borderColor: 'rgba(34, 197, 94, 0.5)',
      backgroundColor: 'rgba(34, 197, 94, 0.05)',
    },
    itemCardEquipped: {
      borderColor: '#22c55e',
      boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
    },
    itemIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      margin: '0 auto 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
    },
    itemName: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#fff',
      marginBottom: '4px',
    },
    itemNameVi: {
      fontSize: '13px',
      color: '#a0a0ff',
      marginBottom: '8px',
    },
    itemDesc: {
      fontSize: '12px',
      color: '#6c7086',
      marginBottom: '12px',
    },
    itemPrice: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 12px',
      backgroundColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 700,
      color: '#a855f7',
      marginBottom: '12px',
    },
    rarityBadge: {
      position: 'absolute' as const,
      top: '8px',
      right: '8px',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
    },
    ownedBadge: {
      position: 'absolute' as const,
      top: '8px',
      left: '8px',
      padding: '4px 8px',
      borderRadius: '6px',
      backgroundColor: '#22c55e',
      color: '#fff',
      fontSize: '10px',
      fontWeight: 700,
    },
    equippedBadge: {
      position: 'absolute' as const,
      top: '8px',
      left: '8px',
      padding: '4px 8px',
      borderRadius: '6px',
      backgroundColor: '#6366f1',
      color: '#fff',
      fontSize: '10px',
      fontWeight: 700,
    },
    buyBtn: {
      width: '100%',
      padding: '10px 16px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: '#6366f1',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    buyBtnDisabled: {
      backgroundColor: 'rgba(100, 100, 100, 0.5)',
      color: '#6c7086',
      cursor: 'not-allowed',
    },
    equipBtn: {
      width: '100%',
      padding: '10px 16px',
      borderRadius: '10px',
      border: '2px solid #22c55e',
      backgroundColor: 'transparent',
      color: '#22c55e',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '48px',
      color: '#a0a0ff',
      fontSize: '18px',
    },
    error: {
      textAlign: 'center' as const,
      padding: '48px',
      color: '#ef4444',
      fontSize: '16px',
    },
    successToast: {
      position: 'fixed' as const,
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      backgroundColor: '#22c55e',
      color: '#fff',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
      zIndex: 1000,
    },
    errorToast: {
      position: 'fixed' as const,
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      backgroundColor: '#ef4444',
      color: '#fff',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
      zIndex: 1000,
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '48px',
      color: '#6c7086',
      fontSize: '16px',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#fff',
      marginBottom: '16px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <button style={styles.backBtn} onClick={() => navigate('/missions')}>
            ← Quay lại
          </button>
          <h1 style={styles.title}>🛒 Cửa hàng XP</h1>
        </div>
        {userXP && (
          <div style={styles.xpDisplay}>
            <span style={styles.xpIcon}>⚡</span>
            <span style={styles.xpAmount}>{userXP.xp.toLocaleString()}</span>
            <span style={styles.xpLabel}>XP</span>
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div style={styles.categoryTabs}>
        {(Object.keys(CATEGORY_INFO) as StoreCategory[]).map(cat => {
          const info = CATEGORY_INFO[cat];
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              style={{
                ...styles.categoryTab,
                ...(isActive ? styles.categoryTabActive : {}),
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              <span>{info.icon}</span>
              <span>{info.nameVi}</span>
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      {isLoading && <div style={styles.loading}>Đang tải cửa hàng...</div>}
      {error && <div style={styles.error}>{error}</div>}
      {!isLoading && !error && filteredItems.length === 0 && (
        <div style={styles.emptyState}>
          Không có món đồ nào trong danh mục này
        </div>
      )}
      {!isLoading && !error && filteredItems.length > 0 && (
        <div style={styles.itemsGrid}>
          {filteredItems.map(item => {
            const isEquipped = userXP?.equippedItems[
              item.category === 'avatars' ? 'avatar' :
              item.category === 'themes' ? 'theme' :
              item.category === 'badge_frames' ? 'badgeFrame' :
              item.category === 'animations' ? 'animation' : 'title'
            ] === item.key;
            const canAfford = userXP && userXP.xp >= item.price;
            const rarityColor = RARITY_COLORS[item.rarity];

            return (
              <div
                key={item.id}
                style={{
                  ...styles.itemCard,
                  ...(item.isOwned ? styles.itemCardOwned : {}),
                  ...(isEquipped ? styles.itemCardEquipped : {}),
                }}
              >
                {/* Badges */}
                <div style={{ ...styles.rarityBadge, backgroundColor: rarityColor, color: '#fff' }}>
                  {item.rarity}
                </div>
                {item.isOwned && !isEquipped && (
                  <div style={{ ...styles.ownedBadge }}>Đã sở hữu</div>
                )}
                {isEquipped && (
                  <div style={{ ...styles.equippedBadge }}>Đang dùng</div>
                )}

                {/* Icon */}
                <div style={{
                  ...styles.itemIcon,
                  backgroundColor: `${rarityColor}20`,
                }}>
                  {item.iconEmoji}
                </div>

                {/* Name */}
                <div style={styles.itemName}>{item.name}</div>
                <div style={styles.itemNameVi}>{item.nameVi}</div>
                <div style={styles.itemDesc}>{item.descriptionVi}</div>

                {/* Price */}
                {!item.isOwned && (
                  <div style={styles.itemPrice}>
                    ⚡ {item.price.toLocaleString()} XP
                  </div>
                )}

                {/* Action button */}
                {item.isOwned ? (
                  isEquipped ? (
                    <button style={styles.equipBtn} disabled>
                      ✓ Đang dùng
                    </button>
                  ) : (
                    <button
                      style={styles.equipBtn}
                      onClick={() => equipItem(item)}
                    >
                      Trang bị
                    </button>
                  )
                ) : (
                  <button
                    style={{
                      ...styles.buyBtn,
                      ...(!canAfford ? styles.buyBtnDisabled : {}),
                    }}
                    disabled={!canAfford || purchasingId === item.id}
                    onClick={() => purchaseItem(item)}
                  >
                    {purchasingId === item.id ? 'Đang mua...' : canAfford ? 'Mua ngay' : 'Không đủ XP'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Success/Error toasts */}
      {purchaseSuccess && <div style={styles.successToast}>✓ {purchaseSuccess}</div>}
      {purchaseError && <div style={styles.errorToast}>✗ {purchaseError}</div>}
    </div>
  );
}
