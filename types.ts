
export type GoalType = 'Ayak' | 'Kafa' | 'Freekick' | 'Penaltı';
export type UserRole = 'admin' | 'player';
export type ParticipantStatus = 'joined' | 'cancelled' | 'pending';
export type TeamSelection = 'A' | 'B' | null;
export type SquadType = 'main' | 'reserve';

export interface Pitch {
  id: string;
  name: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  contact?: {
    phone?: string;
    whatsapp?: string;
    notes?: string;
  };
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  tier: 'Gold' | 'Silver' | 'Bronze';
  description: string;
}

export interface Participant {
  playerId: string;
  name: string;
  photoUrl: string;
  team: TeamSelection;
  status: ParticipantStatus;
  rating?: number;
  squadType: SquadType;
}

export interface PlayerMatchStats {
  playerId: string;
  goals: number;
  goalDetails?: GoalType[];
  assists: number;
  matchRating: number;
  saves?: number;
  interceptions?: number;
  conceded?: number;
  distanceCovered?: number;
  injuryDetail?: string;
  injuryDuration?: number;
}

export interface Player {
  id: string;
  name: string;
  photoUrl: string;
  position: 'Kaleci' | 'Defans' | 'Orta Saha' | 'Forvet';
  rating: number;
  marketValue: number;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
  matchesPlayed: number;
  matchesOrganized: number;
  goals: number;
  assists: number;
  consecutiveMatches: number;
  lastPlayedDate?: string;
  birthDate?: string;
  age?: number;
  height?: number;
  weight?: number;
  preferredFoot?: 'Sağ' | 'Sol' | 'Her İkisi';
  nationality?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  activeInjury?: {
    detail: string;
    weeksRemaining: number;
    dateIncurred: string;
  };
  isDummy?: boolean;
}

export type MatchFormat = '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11';

export interface Match {
  id: string;
  date: string;
  time: string;
  location: string;
  pitchId?: string; 
  format: MatchFormat;
  maxPlayers?: number;
  minimumRequiredPlayers: number;
  organizerId: string;
  participants: Participant[];
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
  status: 'proposal' | 'upcoming' | 'completed';
  playerStats?: PlayerMatchStats[];
}
