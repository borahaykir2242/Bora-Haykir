
import { Player, Match } from '../types';
import { getPlayerBadges } from './badgeService';

/**
 * Calculates a player's market value based on performance, status, and attributes.
 * The value is calculated dynamically to ensure it grows as the player evolves.
 * Now incorporates recent form (last 3 matches) and more nuanced positional logic.
 */
export const calculateDynamicMarketValue = (player: Partial<Player>, allMatches: Match[] = []): number => {
  const rating = player.rating || 50;
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const matchesPlayedCount = player.matchesPlayed || 0;
  const position = player.position || 'Orta Saha';

  // 1. Base value derived from OVR (Exponential growth)
  // Reflects the rarity of high-rated talent
  let baseValue = Math.pow(rating, 3.4) / 350;

  // 2. Position-based performance weights
  const weights: Record<string, { goal: number; assist: number; match: number; defensive: number }> = {
    Kaleci: { goal: 150000, assist: 80000, match: 10000, defensive: 500 }, // Def is Saves for GK
    Defans: { goal: 100000, assist: 60000, match: 8000, defensive: 300 }, // Def is Defending attr impact
    'Orta Saha': { goal: 50000, assist: 55000, match: 6000, defensive: 100 },
    Forvet: { goal: 35000, assist: 30000, match: 5000, defensive: 50 }
  };

  const w = weights[position] || weights['Orta Saha'];
  
  // Performance Accumulation
  let performanceValue = (goals * w.goal) + (assists * w.assist) + (matchesPlayedCount * w.match);
  
  // Defensive contribution (Attribute based bonus to value)
  if (player.attributes) {
    performanceValue += player.attributes.defending * w.defensive;
  }

  // 3. Recent Form Multiplier (Last 3 matches)
  let formMultiplier = 1.0;
  const playerMatches = allMatches
    .filter(m => m.status === 'completed' && m.playerStats?.some(s => s.playerId === player.id))
    .slice(0, 3);

  if (playerMatches.length > 0) {
    const avgRating = playerMatches.reduce((acc, m) => {
      const pStats = m.playerStats?.find(s => s.playerId === player.id);
      return acc + (pStats?.matchRating || 6.0);
    }, 0) / playerMatches.length;

    // Scale: 6.0 is neutral, 8.0+ is +20% boost, 5.0- is -10% penalty
    if (avgRating > 7.5) formMultiplier += (avgRating - 7.5) * 0.15;
    else if (avgRating < 6.0) formMultiplier -= (6.0 - avgRating) * 0.1;
  }

  // 4. Badge Multipliers
  const badges = getPlayerBadges(player as Player);
  let badgeMultiplier = 1.0;
  badges.forEach(b => {
    if (b.tier === 'Gold') badgeMultiplier += 0.25;   // Increased from 0.20
    if (b.tier === 'Silver') badgeMultiplier += 0.12; // Increased from 0.10
    if (b.tier === 'Bronze') badgeMultiplier += 0.06;
  });

  // 5. Loyalty / Streak Multiplier
  let activityMultiplier = 1.0;
  if (player.consecutiveMatches && player.consecutiveMatches >= 3) {
    activityMultiplier += 0.10 + (player.consecutiveMatches * 0.02); // Scales with streak length
  }

  // 6. Final Calculation
  const totalValue = (baseValue + performanceValue) * formMultiplier * badgeMultiplier * activityMultiplier;

  // Round to nearest 1000 for "professional" looking values
  return Math.max(5000, Math.round(totalValue / 1000) * 1000);
};
