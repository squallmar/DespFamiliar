import { useEffect, useState } from 'react';
import { useAchievements } from './useAchievements';
import { useAuth } from '@/contexts/AuthContext';

export function useNewAchievements() {
  const { user } = useAuth();
  const { achievements } = useAchievements();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!user || !achievements || achievements.length === 0) {
      setNewCount(0);
      return;
    }

    // Get last seen timestamp from localStorage
    const lastSeenKey = 'achievements_last_seen';
    const lastSeenStr = typeof window !== 'undefined' 
      ? window.localStorage.getItem(lastSeenKey) 
      : null;
    
    const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(0);

    // Count achievements awarded after last seen
    const newAchievements = achievements.filter((ach: any) => {
      const awardedAt = new Date(ach.awarded_at || ach.awardedAt);
      return awardedAt > lastSeen;
    });

    setNewCount(newAchievements.length);
  }, [achievements, user]);

  const markAllAsSeen = () => {
    if (typeof window !== 'undefined') {
      const now = new Date().toISOString();
      window.localStorage.setItem('achievements_last_seen', now);
      setNewCount(0);
    }
  };

  return {
    newCount,
    markAllAsSeen,
  };
}
