
import { Player, Badge } from '../types';

export const getPlayerBadges = (player: Player): Badge[] => {
  const badges: Badge[] = [];

  // Organization Badges
  if (player.matchesOrganized >= 10) {
    badges.push({ id: 'org_gold', name: 'Efsane Lider', icon: 'fa-crown', color: 'text-yellow-500', tier: 'Gold', description: '10+ Maç Organize Etti' });
  } else if (player.matchesOrganized >= 5) {
    badges.push({ id: 'org_silver', name: 'Organizatör', icon: 'fa-calendar-check', color: 'text-gray-400', tier: 'Silver', description: '5+ Maç Organize Etti' });
  }

  // Participation Badges
  if (player.matchesPlayed >= 20) {
    badges.push({ id: 'play_gold', name: 'Sahanın Tapusu', icon: 'fa-medal', color: 'text-yellow-600', tier: 'Gold', description: '20+ Maç Oynadı' });
  } else if (player.matchesPlayed >= 10) {
    badges.push({ id: 'play_silver', name: 'Maç Müdavimi', icon: 'fa-clock', color: 'text-blue-400', tier: 'Silver', description: '10+ Maç Oynadı' });
  }

  // Performance Badges
  if (player.goals >= 30) {
    badges.push({ id: 'goal_gold', name: 'Gol Makinesi', icon: 'fa-fire', color: 'text-orange-500', tier: 'Gold', description: '30+ Gol Attı' });
  }
  
  if (player.assists >= 20) {
    badges.push({ id: 'assist_gold', name: 'Asist Canavarı', icon: 'fa-magic', color: 'text-purple-500', tier: 'Gold', description: '20+ Asist Yaptı' });
  }

  if (player.consecutiveMatches >= 5) {
    badges.push({ id: 'streak', name: 'İstikrar Abidesi', icon: 'fa-bolt', color: 'text-green-500', tier: 'Gold', description: '5 Maç Üst Üste Oynadı' });
  }

  return badges;
};
