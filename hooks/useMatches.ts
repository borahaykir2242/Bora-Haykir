
import { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Match, Player, MatchFormat, Participant, Pitch, SquadType } from '../types';

const DEFAULT_PITCHES: Pitch[] = [
  { id: '1', name: 'Central Pitch' },
  { id: '2', name: 'Olympic Arena' }
];

export const useMatches = (currentUser: Player | null) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>(DEFAULT_PITCHES);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const [allMatches, allPitches] = await Promise.all([
        dbService.getMatches(),
        dbService.getPitches()
      ]);
      setMatches(Array.isArray(allMatches) ? allMatches : []);
      
      const loadedPitches = Array.isArray(allPitches) && allPitches.length > 0 
        ? allPitches 
        : DEFAULT_PITCHES;
      setPitches(loadedPitches);
    } catch (e) {
      console.error("Failed to fetch match data", e);
      setPitches(DEFAULT_PITCHES);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchMatches();
  }, [currentUser?.id]);

  const proposeMatch = async (date: string, time: string, location: string, format: MatchFormat) => {
    if (!currentUser || !date || !time || !location) return;
    const minRequired = parseInt(format.split('v')[0]) * 2;
    
    const initialParticipant: Participant = {
      playerId: currentUser.id,
      name: currentUser.name || 'Anonymous',
      photoUrl: currentUser.photoUrl || '',
      team: null,
      status: 'joined',
      squadType: 'main'
    };

    const newMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      date, time, location, format, 
      minimumRequiredPlayers: minRequired,
      organizerId: currentUser.id,
      participants: [initialParticipant],
      teamA: [],
      teamB: [],
      scoreA: 0, scoreB: 0, status: 'proposal'
    };

    try {
      await dbService.saveMatch(newMatch);
      setMatches(prev => [newMatch, ...(prev || [])]);
    } catch (e) {
      console.error("Silent fail on save match", e);
    }
  };

  const applyToMatch = async (matchId: string, squadType: SquadType = 'main') => {
    if (!currentUser || !matchId) return;
    
    const match = (matches || []).find(m => m.id === matchId);
    if (!match) return;

    const currentParticipants = Array.isArray(match.participants) ? match.participants : [];
    if (currentParticipants.some(p => p.playerId === currentUser.id)) return;

    const newParticipant: Participant = {
      playerId: currentUser.id,
      name: currentUser.name || 'Anonymous',
      photoUrl: currentUser.photoUrl || '',
      team: null,
      status: 'joined',
      squadType: squadType
    };

    const updatedMatch = { 
      ...match, 
      participants: [...currentParticipants, newParticipant] 
    };

    try {
      await dbService.saveMatch(updatedMatch);
      setMatches(prev => (prev || []).map(m => m.id === matchId ? updatedMatch : m));
    } catch (e) {
      console.error("Silent fail on apply to match", e);
    }
  };

  const leaveMatch = async (matchId: string, playerId: string) => {
    if (!matchId || !playerId) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedParticipants = (match.participants || []).filter(p => p.playerId !== playerId);
    const updatedMatch = { ...match, participants: updatedParticipants };

    try {
      await dbService.saveMatch(updatedMatch);
      setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));
    } catch (e) {
      console.error("Failed to leave match", e);
      throw e;
    }
  };

  /**
   * Transfers organizer rights to a new player and removes the old organizer from participants.
   */
  const delegateAndLeave = async (matchId: string, oldPlayerId: string, newOrganizerId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedParticipants = (match.participants || []).filter(p => p.playerId !== oldPlayerId);
    const updatedMatch = { 
      ...match, 
      organizerId: newOrganizerId, 
      participants: updatedParticipants 
    };

    try {
      await dbService.saveMatch(updatedMatch);
      setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));
    } catch (e) {
      console.error("Delegation failed", e);
      throw e;
    }
  };

  const joinMainSquad = async (matchId: string, playerId: string) => {
    if (!matchId || !playerId) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedParticipants = (match.participants || []).map(p => 
      p.playerId === playerId ? { ...p, squadType: 'main' as SquadType } : p
    );
    const updatedMatch = { ...match, participants: updatedParticipants };

    try {
      await dbService.saveMatch(updatedMatch);
      setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));
    } catch (e) {
      console.error("Failed to switch to main squad", e);
      throw e;
    }
  };

  const updateMatchStatus = async (updatedMatch: Match) => {
    if (!updatedMatch || !updatedMatch.id) return;
    try {
      await dbService.saveMatch(updatedMatch);
      setMatches(prev => (prev || []).map(m => m.id === updatedMatch.id ? updatedMatch : m));
    } catch (e) {
      console.error("Silent fail on status update", e);
    }
  };

  const addPitch = async (pitch: Pitch) => {
    if (!pitch || !pitch.name) return false;
    try {
      const currentPitches = Array.isArray(pitches) ? pitches : [];
      if (!currentPitches.some(p => p.name === pitch.name)) {
        const updated = [...currentPitches, pitch];
        await dbService.savePitches(updated);
        setPitches(updated);
        return true;
      }
    } catch (e) {
      console.error("Silent fail on add pitch", e);
    }
    return false;
  };

  return { 
    matches, 
    pitches, 
    loadingMatches, 
    proposeMatch, 
    applyToMatch, 
    leaveMatch, 
    delegateAndLeave,
    joinMainSquad, 
    updateMatchStatus, 
    addPitch, 
    setMatches 
  };
};
