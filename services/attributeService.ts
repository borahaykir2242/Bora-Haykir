
import { Player, PlayerMatchStats } from '../types';

/**
 * Oyuncunun son maç performansına göre yeteneklerini günceller.
 * - Goller -> Şut artışı
 * - Asistler -> Pas artışı
 * - Yüksek Reyting -> Fiziksel ve Dribbling artışı
 * - Kaleci Kurtarışı -> Savunma artışı
 */
export const evolveAttributes = (player: Player, stats: PlayerMatchStats): Player['attributes'] => {
  const attrs = { ...player.attributes };
  const cap = 99;

  // Gol katkısı: Şut yeteneğini geliştirir
  if (stats.goals > 0) {
    attrs.shooting = Math.min(cap, attrs.shooting + (stats.goals * 0.5));
  }

  // Asist katkısı: Pas yeteneğini geliştirir
  if (stats.assists > 0) {
    attrs.passing = Math.min(cap, attrs.passing + (stats.assists * 0.4));
  }

  // Maç reytingi bonusu: Genel fiziksel ve teknik gelişim
  if (stats.matchRating >= 8) {
    attrs.physical = Math.min(cap, attrs.physical + 0.3);
    attrs.dribbling = Math.min(cap, attrs.dribbling + 0.2);
    attrs.pace = Math.min(cap, attrs.pace + 0.1);
  } else if (stats.matchRating <= 5) {
    // Kötü performans hafif düşüş (isteğe bağlı)
    attrs.physical = Math.max(30, attrs.physical - 0.1);
  }

  // Mevki bazlı özel gelişimler
  if (player.position === 'Kaleci' && (stats.saves || 0) > 3) {
    attrs.defending = Math.min(cap, attrs.defending + 0.5);
  }

  if (player.position === 'Defans' && stats.matchRating >= 7.5) {
    attrs.defending = Math.min(cap, attrs.defending + 0.3);
  }

  // Değerleri tam sayıya yuvarla
  Object.keys(attrs).forEach((key) => {
    const k = key as keyof Player['attributes'];
    attrs[k] = Math.round(attrs[k] * 10) / 10;
  });

  return attrs;
};

export const calculateOverallRating = (attrs: Player['attributes']): number => {
  const sum = Object.values(attrs).reduce((a, b) => a + b, 0);
  return Math.round(sum / 6);
};
