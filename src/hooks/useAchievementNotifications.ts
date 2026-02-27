import { useEffect, useRef } from 'react';
import { useAchievements } from './useAchievements';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface AchievementData {
  description?: string;
  [key: string]: unknown;
}

export function useAchievementNotifications() {
  const { user } = useAuth();
  const { achievements } = useAchievements();
  const { show: showToast } = useToast();
  const prevAchievementCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (!user || typeof window === 'undefined' || audioContextRef.current) return;
    
    try {
      const AudioContextConstructor = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextConstructor) {
        audioContextRef.current = new AudioContextConstructor();
      }
    } catch {
      console.log('Audio context not available');
    }
  }, [user]);

  // Create success sound
  const playSuccessSound = () => {
    if (!audioContextRef.current) return;
    
    try {
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      console.log('Could not play sound');
    }
  };

  // Monitor achievements and show notification when new ones arrive
  useEffect(() => {
    // Skip if user is not logged in
    if (!user) return;
    
    const currentCount = achievements?.length || 0;
    
    // Skip first render
    if (prevAchievementCountRef.current === 0) {
      prevAchievementCountRef.current = currentCount;
      return;
    }

    // Check if there are new achievements
    if (currentCount > prevAchievementCountRef.current) {
      const newCount = currentCount - prevAchievementCountRef.current;
      
      // Get the newest achievement(s)
      if (achievements && achievements.length > 0) {
        const latestAchievement = achievements[0] as AchievementData;
        const achievementName = latestAchievement.description || 'Nova Conquista';
        
        // Show toast notification
        showToast(
          `🎉 Parabéns! Você desbloqueou: "${achievementName}"${newCount > 1 ? ` +${newCount - 1} mais` : ''}`,
          'success'
        );
        
        // Play sound
        playSuccessSound();
        
        // Trigger confetti/visual effect
        triggerConfetti();
      }
      
      prevAchievementCountRef.current = currentCount;
    }
  }, [achievements, showToast, user]);
}

// Simple confetti effect
function triggerConfetti() {
  if (typeof document === 'undefined') return;
  
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = '-10px';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = '50%';
    confetti.style.pointerEvents = 'none';
    confetti.style.zIndex = '9999';
    
    document.body.appendChild(confetti);
    
    const duration = 2000 + Math.random() * 1000;
    let startTime: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;
      
      if (progress < 1) {
        confetti.style.top = (progress * window.innerHeight) + 'px';
        confetti.style.opacity = String(1 - progress);
        confetti.style.transform = `translateX(${Math.sin(progress * Math.PI * 4) * 50}px) rotate(${progress * 720}deg)`;
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(confetti);
      }
    };
    
    requestAnimationFrame(animate);
  }
}
