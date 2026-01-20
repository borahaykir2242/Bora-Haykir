
import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { dbService } from '../services/dbService';
import { Player } from '../types';

const DEFAULT_ATTRIBUTES = { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 };

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        let profile = await dbService.getPlayer(firebaseUser.uid);
        
        if (!profile) {
          const newPlayer: Player = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'New Player',
            email: firebaseUser.email || '',
            photoUrl: firebaseUser.photoURL || `https://avatar.iran.liara.run/public/${Math.floor(Math.random() * 100)}`,
            position: 'Orta Saha',
            rating: 50,
            marketValue: 25000,
            attributes: DEFAULT_ATTRIBUTES,
            matchesPlayed: 0,
            matchesOrganized: 0,
            goals: 0,
            assists: 0,
            consecutiveMatches: 0,
            role: 'player'
          };
          await dbService.savePlayer(newPlayer);
          profile = newPlayer;
        } else {
          // DEFENSIVE: Ensure existing profiles have valid nested objects
          if (!profile.attributes) profile.attributes = DEFAULT_ATTRIBUTES;
        }

        setCurrentUser(profile);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const profile = await dbService.getPlayer(auth.currentUser.uid);
      if (profile) {
        if (!profile.attributes) profile.attributes = DEFAULT_ATTRIBUTES;
        setCurrentUser(profile);
      }
    }
  };

  return { currentUser, isAuthenticated, loading, logout, refreshProfile, setCurrentUser };
};
