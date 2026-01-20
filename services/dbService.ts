
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Player, Match, Pitch } from '../types';

const PLAYERS_COL = 'players';
const MATCHES_COL = 'matches';
const SETTINGS_COL = 'settings';

export const dbService = {
  // Players
  async savePlayer(player: Player) {
    if (!player || !player.id) return;
    const { password, ...safePlayer } = player as any;
    const playerRef = doc(db, PLAYERS_COL, player.id);
    await setDoc(playerRef, safePlayer, { merge: true });
  },
  
  async getPlayer(id: string) {
    try {
      if (!id) return null;
      const snap = await getDoc(doc(db, PLAYERS_COL, id));
      return snap.exists() ? snap.data() as Player : null;
    } catch (e) {
      console.error("Error fetching player:", e);
      return null;
    }
  },
  
  async getAllPlayers(): Promise<Player[]> {
    try {
      const snap = await getDocs(collection(db, PLAYERS_COL));
      const players = snap.docs.map(d => d.data() as Player);
      return Array.isArray(players) ? players : [];
    } catch (e) {
      console.error("Error fetching players:", e);
      return [];
    }
  },

  // Matches
  async saveMatch(match: Match) {
    if (!match || !match.id) return;
    await setDoc(doc(db, MATCHES_COL, match.id), match);
  },
  
  async getMatches(): Promise<Match[]> {
    try {
      const q = query(collection(db, MATCHES_COL), orderBy("date", "desc"));
      const snap = await getDocs(q);
      const matches = snap.docs.map(d => d.data() as Match);
      return Array.isArray(matches) ? matches : [];
    } catch (e) {
      console.error("Error fetching matches:", e);
      return [];
    }
  },

  // Pitches - Supporting both string legacy and Pitch objects
  async getPitches(): Promise<Pitch[]> {
    try {
      const snap = await getDoc(doc(db, SETTINGS_COL, 'pitches'));
      if (snap.exists()) {
        const data = snap.data();
        const list = (data && Array.isArray(data.list)) ? data.list : [];
        // Normalize strings to objects if necessary
        return list.map((p: any) => typeof p === 'string' ? { id: p, name: p } : p);
      }
      return [
        { id: '1', name: 'Central Pitch' },
        { id: '2', name: 'Olympic Arena' }
      ];
    } catch (e) {
      console.error("Error fetching pitches:", e);
      return [];
    }
  },
  
  async savePitches(list: Pitch[]) {
    if (!Array.isArray(list)) return;
    await setDoc(doc(db, SETTINGS_COL, 'pitches'), { list });
  }
};
