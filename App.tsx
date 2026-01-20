
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Player, Match, PlayerMatchStats, MatchFormat, Pitch, SquadType, Participant } from './types';
import TeamBuilder from './components/TeamBuilder';
import PlayerCard from './components/PlayerCard';
import PlayerModal from './components/PlayerModal';
import PlayerDetailModal from './components/PlayerDetailModal';
import MatchDetailModal from './components/MatchDetailModal';
import MatchFinalizationModal from './components/MatchFinalizationModal';
import AuthScreen from './components/AuthScreen';
import { dbService } from './services/dbService';
import { calculateDynamicMarketValue } from './services/marketService';
import { evolveAttributes, calculateOverallRating } from './services/attributeService';
import { useAuth } from './hooks/useAuth';
import { useMatches } from './hooks/useMatches';
import { usePlayers } from './hooks/usePlayers';
import { db } from './services/firebase';
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

type Tab = 'dashboard' | 'propose' | 'history' | 'manage-players' | 'profile' | 'pitches';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showOnlyMyMatches, setShowOnlyMyMatches] = useState(false);
  const [showJoinSelection, setShowJoinSelection] = useState<Match | null>(null);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [delegationMatch, setDelegationMatch] = useState<Match | null>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const { currentUser, isAuthenticated, loading: authLoading, logout, setCurrentUser } = useAuth();
  const { 
    matches = [], 
    pitches = [], 
    proposeMatch, 
    applyToMatch, 
    leaveMatch, 
    delegateAndLeave,
    updateMatchStatus, 
    setMatches 
  } = useMatches(currentUser);
  
  const { 
    players = [], 
    searchedPlayers = [], 
    searchQuery, 
    setSearchQuery, 
    setPlayers, 
    fetchPlayers,
    filterPosition,
    setFilterPosition,
    sortOption,
    setSortOption,
    filterStatus,
    setFilterStatus,
    filterTier,
    setFilterTier
  } = usePlayers(currentUser);

  // New state for extended filters in Squad Pool
  const [filterAge, setFilterAge] = useState('All');
  const [filterRating, setFilterRating] = useState('All');

  const [selectedPlayerIdForDetail, setSelectedPlayerIdForDetail] = useState<string | null>(null);
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<Match | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();
  const [activeDraftMatch, setActiveDraftMatch] = useState<Match | null>(null);
  const [finishingMatch, setFinishingMatch] = useState<Match | null>(null);

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const [proposalDate, setProposalDate] = useState('');
  const [proposalTime, setProposalTime] = useState('');
  const [proposalLocation, setProposalLocation] = useState('');
  const [proposalFormat, setProposalFormat] = useState<MatchFormat>('7v7');
  
  const [newPitch, setNewPitch] = useState<Partial<Pitch>>({ name: '', contact: {} });
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEditData, setProfileEditData] = useState<Partial<Player>>({});

  const isProfileComplete = useMemo(() => {
    if (!currentUser) return false;
    return !!(currentUser.name && currentUser.photoUrl && currentUser.birthDate);
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'admin';

  // Age calculation helper
  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Re-filter players based on standard usePlayers output PLUS new ranges
  const finalSearchedPlayers = useMemo(() => {
    let list = [...searchedPlayers];

    // Filter by Age Range
    if (filterAge !== 'All') {
      list = list.filter(p => {
        if (!p.birthDate) return false;
        const age = getAge(p.birthDate);
        if (filterAge === '18-25') return age >= 18 && age <= 25;
        if (filterAge === '26-30') return age >= 26 && age <= 30;
        if (filterAge === '31-35') return age >= 31 && age <= 35;
        if (filterAge === '35+') return age > 35;
        return true;
      });
    }

    // Filter by Rating Range
    if (filterRating !== 'All') {
      list = list.filter(p => {
        if (filterRating === '<50') return p.rating < 50;
        if (filterRating === '50-69') return p.rating >= 50 && p.rating <= 69;
        if (filterRating === '70-89') return p.rating >= 70 && p.rating <= 89;
        if (filterRating === '90+') return p.rating >= 90;
        return true;
      });
    }

    // Additional Sorts (Age)
    // Basic sorting is already handled in usePlayers.ts hook, 
    // but we can augment or rely on hook if it matches request.
    // The request asks for Name Z-A which might not be in the hook.
    if (sortOption === 'age-asc') {
        list.sort((a, b) => {
            const ageA = a.birthDate ? getAge(a.birthDate) : 0;
            const ageB = b.birthDate ? getAge(b.birthDate) : 0;
            return ageA - ageB;
        });
    } else if (sortOption === 'age-desc') {
        list.sort((a, b) => {
            const ageA = a.birthDate ? getAge(a.birthDate) : 0;
            const ageB = b.birthDate ? getAge(b.birthDate) : 0;
            return ageB - ageA;
        });
    } else if (sortOption === 'name-desc') {
        list.sort((a, b) => b.name.localeCompare(a.name));
    }

    return list;
  }, [searchedPlayers, filterAge, filterRating, sortOption]);

  const handleAuthSuccess = async (player: Player) => {
    setCurrentUser(player);
    await fetchPlayers();
    if (!player.birthDate) setActiveTab('profile');
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    try {
      const currentAttrs = currentUser.attributes || { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 };
      const updatedPlayerLocal = { ...currentUser, ...profileEditData, attributes: currentAttrs } as Player;
      updatedPlayerLocal.rating = calculateOverallRating(updatedPlayerLocal.attributes);
      updatedPlayerLocal.marketValue = calculateDynamicMarketValue(updatedPlayerLocal, matches || []);
      
      const sanitizedUpdate: any = {
        name: updatedPlayerLocal.name,
        photoUrl: updatedPlayerLocal.photoUrl,
        birthDate: updatedPlayerLocal.birthDate,
        nationality: updatedPlayerLocal.nationality,
        height: Number(updatedPlayerLocal.height) || null,
        weight: Number(updatedPlayerLocal.weight) || null,
        preferredFoot: updatedPlayerLocal.preferredFoot,
        rating: updatedPlayerLocal.rating,
        marketValue: updatedPlayerLocal.marketValue,
        attributes: updatedPlayerLocal.attributes
      };

      await dbService.savePlayer({ ...sanitizedUpdate, id: currentUser.id } as Player);
      setPlayers(prev => (prev || []).map(p => p.id === currentUser.id ? updatedPlayerLocal : p));
      setCurrentUser(updatedPlayerLocal);
      setIsEditingProfile(false);
      setProfileEditData({});
      alert("Profile updated successfully!");
    } catch (e: any) {
      console.error("CRITICAL: Profile save failed", e);
      alert("Failed to save profile. Please check your connection.");
    }
  };

  const handleJoinMatch = async (matchId: string, type: SquadType) => {
    try {
      await applyToMatch(matchId, type);
      setShowJoinSelection(null);
    } catch (e) {
      console.error("CRITICAL: Join match failed", e);
      alert("Could not join match. Please try again.");
    }
  };

  const handleLeaveMatch = async (matchId: string) => {
    if (!currentUser) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const isOrganizer = match.organizerId === currentUser.id;
    const otherParticipants = (match.participants || []).filter(p => p.playerId !== currentUser.id);

    if (isOrganizer && otherParticipants.length > 0) {
      setDelegationMatch(match);
      return;
    }

    if (!window.confirm("Are you sure you want to leave this match?")) return;
    try {
      await leaveMatch(matchId, currentUser.id);
    } catch (e) {
      console.error("Leave match failed", e);
      alert("Failed to leave match.");
    }
  };

  const handleDelegateAndLeave = async (newOrganizerId: string) => {
    if (!currentUser || !delegationMatch) return;
    try {
      await delegateAndLeave(delegationMatch.id, currentUser.id, newOrganizerId);
      setDelegationMatch(null);
      alert("Ownership transferred and you have left the match.");
    } catch (e) {
      console.error("Delegation failed", e);
      alert("Failed to transfer ownership.");
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileEditData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    if (!window.confirm("Are you sure you want to cancel this match proposal?")) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
      setMatches(prev => (prev || []).filter(m => m.id !== matchId));
      alert("Match proposal cancelled successfully.");
    } catch (error) {
      console.error("Failed to cancel match:", error);
      alert("Error: Could not cancel match.");
    }
  };

  const handleSavePitch = async () => {
    if (!newPitch.name) {
      alert("Pitch name is required.");
      return;
    }
    
    const currentPitches = Array.isArray(pitches) ? [...pitches] : [];
    try {
      let updatedPitches: Pitch[];
      if (editingPitchId) {
        updatedPitches = currentPitches.map(p => p.id === editingPitchId ? { ...p, ...newPitch, id: editingPitchId } as Pitch : p);
      } else {
        const pitchObj: Pitch = {
          id: Math.random().toString(36).substr(2, 9),
          name: newPitch.name.trim() || '',
          contact: newPitch.contact || {},
          address: newPitch.address,
          location: newPitch.location
        };
        updatedPitches = [...currentPitches, pitchObj];
      }
      await dbService.savePitches(updatedPitches);
      setNewPitch({ name: '', contact: {} });
      setEditingPitchId(null);
      window.location.reload(); 
    } catch (e) {
      console.error("CRITICAL: Pitch save failed", e);
      alert("Failed to save pitch. Check your internet connection.");
    }
  };

  const handleDeletePitch = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this pitch?")) return;
    try {
      const updated = pitches.filter(p => p.id !== id);
      await dbService.savePitches(updated);
      window.location.reload();
    } catch (e) {
      console.error("Delete pitch failed", e);
    }
  };

  const handleFinalizeMatchResults = async (match: Match, scoreA: number, scoreB: number, playerStats: PlayerMatchStats[]) => {
    if (!match) return;
    try {
      const updatedMatch: Match = { ...match, scoreA, scoreB, status: 'completed', playerStats };
      await dbService.saveMatch(updatedMatch);
      const playersToUpdate = (players || []).map(p => {
        if (p.isDummy) return p;
        const stats = (playerStats || []).find(s => s.playerId === p.id);
        if (stats) {
          const evolvedAttrs = evolveAttributes(p, stats);
          return {
            ...p,
            attributes: evolvedAttrs,
            rating: calculateOverallRating(evolvedAttrs),
            matchesPlayed: (p.matchesPlayed || 0) + 1,
            goals: (p.goals || 0) + (stats.goals || 0),
            assists: (p.assists || 0) + (stats.assists || 0),
            lastPlayedDate: match.date
          };
        }
        return p;
      });
      for (const p of playersToUpdate) {
        if (!p.isDummy && (playerStats || []).some(s => s.playerId === p.id)) {
          await dbService.savePlayer(p);
        }
      }
      setPlayers(playersToUpdate);
      setMatches(prev => (prev || []).map(m => m.id === match.id ? updatedMatch : m));
      setFinishingMatch(null);
      setActiveTab('history');
    } catch (e) {
      console.error("Finalization failed", e);
    }
  };

  const handleProposeSubmit = async () => {
    if (!proposalDate || !proposalTime || !proposalLocation) {
        alert("Please fill in all fields (Date, Time, Location).");
        return;
    }
    try {
      await proposeMatch(proposalDate, proposalTime, proposalLocation, proposalFormat);
      setActiveTab('dashboard');
      setProposalDate('');
      setProposalTime('');
      setProposalLocation('');
    } catch (e) {
      console.error("Proposal failed", e);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysCount; d++) days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return days;
  }, [currentCalendarDate]);

  const filteredMatches = useMemo(() => {
    let list = Array.isArray(matches) ? matches : [];
    if (selectedCalendarDate) {
      list = list.filter(m => m.date === selectedCalendarDate);
    }
    if (showOnlyMyMatches && currentUser) {
      list = list.filter(m => (m.participants || []).some(p => p.playerId === currentUser.id));
    }
    return list;
  }, [matches, selectedCalendarDate, showOnlyMyMatches, currentUser]);

  if (authLoading) return (
    <div className="min-h-screen bg-sunNavy flex flex-col items-center justify-center text-white font-black italic">
      <div className="w-16 h-16 border-4 border-sunYellow border-t-transparent rounded-full animate-spin mb-4"></div>
      SYNCING WITH SERVER...
    </div>
  );

  if (!isAuthenticated || !currentUser) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen bg-gray-100 pb-24 font-sans text-gray-900">
      <header className="bg-sunNavy text-white p-6 shadow-lg mb-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-sunYellow p-2 rounded-full cursor-pointer shadow-md" onClick={() => setActiveTab('dashboard')}>
              <i className="fas fa-plane text-sunNavy text-2xl"></i>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">SunExpress <span className="text-sunYellow">Football Pro</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => isProfileComplete ? setActiveTab('propose') : setShowProfileRequiredModal(true)} 
              className="hidden md:flex bg-sunYellow text-sunNavy px-4 py-2 rounded-xl text-xs font-black items-center gap-2 transition-all hover:scale-105 shadow-md uppercase"
            >
              <i className="fas fa-plus"></i> Propose Match
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-sunYellow overflow-hidden cursor-pointer" onClick={() => setActiveTab('profile')}>
              <img src={currentUser.photoUrl} className="w-full h-full object-cover" />
            </div>
            <button onClick={logout} className="text-white/60 hover:text-white transition-colors">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {activeDraftMatch ? (
          <div className="animate-fadeIn">
             <div className="mb-6 flex items-center justify-between">
                <button onClick={() => setActiveDraftMatch(null)} className="bg-white text-sunNavy px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm border border-gray-100 uppercase transition-all hover:bg-gray-50 active:scale-95">
                   <i className="fas fa-arrow-left text-xs"></i> BACK TO HOME
                </button>
                <div className="text-right">
                   <p className="text-sunNavy font-black italic uppercase text-sm">{activeDraftMatch.location}</p>
                </div>
             </div>
             <TeamBuilder 
               players={(players || []).filter(p => (activeDraftMatch?.participants || []).map(part => part.playerId).includes(p.id))} 
               organizerId={activeDraftMatch.organizerId}
               currentUser={currentUser} 
               onTeamCreated={async (a, b) => {
                 if (!activeDraftMatch) return;
                 const updated = { ...activeDraftMatch, teamA: a, teamB: b, status: 'upcoming' as const };
                 await updateMatchStatus(updated);
                 setActiveDraftMatch(null);
               }} 
             />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <div key="dashboard" className="space-y-8 animate-fadeIn">
                {!isProfileComplete && (
                  <div className="bg-sunYellow/10 border-2 border-sunYellow p-4 rounded-3xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-exclamation-circle text-sunYellow text-xl"></i>
                      <p className="text-xs font-black text-sunNavy uppercase">Profile Incomplete! You must set your birth date to join matches.</p>
                    </div>
                    <button onClick={() => setActiveTab('profile')} className="bg-sunNavy text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap">Go to Profile</button>
                  </div>
                )}

                <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                      <h2 className="text-lg font-black text-sunNavy uppercase italic">Calendar</h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowOnlyMyMatches(!showOnlyMyMatches)}
                          className={`mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all border ${showOnlyMyMatches ? 'bg-sunNavy text-white border-sunNavy' : 'bg-white text-gray-400 border-gray-200'}`}
                        >
                          {showOnlyMyMatches ? 'Showing: My Matches' : 'Filter: My Matches'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-sunYellow/20 transition-colors"><i className="fas fa-chevron-left"></i></button>
                      <span className="font-bold uppercase">{currentCalendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-sunYellow/20 transition-colors"><i className="fas fa-chevron-right"></i></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => (
                      <div key={d} className="text-[10px] font-black text-gray-300 text-center uppercase mb-1">{d}</div>
                    ))}
                    {(calendarDays || []).map((day, idx) => day ? (
                      <button key={day} onClick={() => setSelectedCalendarDate(selectedCalendarDate === day ? null : day)} className={`h-10 md:h-12 rounded-xl flex items-center justify-center text-xs md:text-sm font-bold border-2 transition-all relative ${selectedCalendarDate === day ? 'border-sunYellow bg-sunYellow/10 text-sunNavy' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                        {day.split('-')[2]}
                        {(matches || []).some(m => m.date === day) && (
                          <i className="fas fa-futbol absolute bottom-1 text-[8px] text-sunYellow drop-shadow-sm"></i>
                        )}
                      </button>
                    ) : <div key={idx}></div>)}
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6">
                  {filteredMatches.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                      <i className="fas fa-futbol text-gray-200 text-4xl mb-4"></i>
                      <p className="text-gray-400 font-black uppercase italic text-xs tracking-widest">No matches found for this selection</p>
                    </div>
                  ) : filteredMatches.map(match => {
                    const participants = Array.isArray(match?.participants) ? match.participants : [];
                    const mainParticipants = participants.filter(p => (p.squadType || 'main') === 'main');
                    const minRequired = match.minimumRequiredPlayers || 14;
                    const selfParticipant = participants.find(p => p.playerId === currentUser.id);
                    const isApplied = !!selfParticipant;
                    const isValidated = mainParticipants.length >= minRequired;
                    const isProposer = match.organizerId === currentUser.id;

                    return (
                      <div key={match.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-2 transition-all ${isApplied ? 'border-sunNavy/20 ring-4 ring-sunNavy/5' : 'border-gray-100'} hover:shadow-md relative overflow-hidden group`}>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-sunNavy shadow-inner border border-gray-100 group-hover:scale-110 transition-transform">
                              <i className="fas fa-map-marker-alt text-xl"></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg md:text-xl font-black text-gray-800 uppercase italic tracking-tighter">{match.location}</h3>
                                {isApplied && (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-sunNavy text-white text-[9px] font-black px-3 py-1 rounded-lg tracking-widest uppercase shadow-sm">
                                      JOINED {selfParticipant?.squadType === 'reserve' ? '(RESERVE)' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{match.date}</span>
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{match.time}</span>
                                <span className="bg-sunNavy/5 text-sunNavy px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{match.format}</span>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-black text-sunNavy hover:text-sunYellow transition-colors uppercase flex items-center gap-1 ml-2 underline decoration-sunYellow/30"
                                >
                                  NAVIGATE <i className="fas fa-directions"></i>
                                </a>
                              </div>
                            </div>
                          </div>
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-sm ${match.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : match.status === 'proposal' ? 'bg-orange-100 text-orange-700' : 'bg-sunYellow text-sunNavy'}`}>
                            {match.status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="mb-6 space-y-4">
                           <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                             <div className="flex justify-between items-center mb-3">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                 <i className="fas fa-users text-sunNavy"></i> Participants List
                               </p>
                               <span className={`text-[10px] font-black ${isValidated ? 'text-green-600' : 'text-sunNavy'}`}>
                                 {mainParticipants.length} / {minRequired} REQUIRED
                               </span>
                             </div>
                             
                             {participants.length > 0 ? (
                               <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                 {participants.map((p, idx) => (
                                   <div key={p.playerId + idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-sunYellow">
                                      <img src={p.photoUrl} className="w-5 h-5 rounded-full object-cover border border-gray-100" />
                                      <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">{p.name}</span>
                                      {p.squadType === 'reserve' && <span className="text-[8px] font-black text-orange-500 uppercase">RES</span>}
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-[10px] text-gray-300 font-bold italic py-2">No players joined yet...</p>
                             )}

                             <div className="mt-4 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
                               <div className={`h-full transition-all duration-1000 ${isValidated ? 'bg-green-500' : 'bg-sunNavy'}`} style={{ width: `${Math.min(100, (mainParticipants.length / minRequired) * 100)}%` }}></div>
                             </div>
                           </div>
                        </div>

                        <div className="flex gap-3">
                          {match.status === 'proposal' && !isApplied && (
                            <button 
                              onClick={() => handleJoinMatch(match.id, 'main')} 
                              className="flex-1 py-4 rounded-2xl font-black transition-all uppercase text-[11px] flex items-center justify-center gap-2 bg-sunNavy text-white hover:bg-sunNavy/90 hover:scale-[1.02] shadow-xl"
                            >
                              <i className="fas fa-user-plus"></i> JOIN MATCH
                            </button>
                          )}
                          
                          {match.status === 'proposal' && isApplied && (participants.length >= 2) && (
                            <button onClick={() => setActiveDraftMatch(match)} className="bg-sunYellow text-sunNavy px-6 py-4 rounded-2xl font-black hover:scale-[1.05] transition-all uppercase text-[11px] shadow-lg flex items-center gap-2">
                              <i className="fas fa-users-cog"></i> DRAFT
                            </button>
                          )}

                          {isAdmin && match.status === 'upcoming' && (
                            <button onClick={() => setFinishingMatch(match)} className="w-full bg-sunNavy text-white py-4 rounded-2xl font-black uppercase text-[11px] shadow-xl hover:scale-[1.02] transition-all">FINISH & REPORT</button>
                          )}

                          {match.status === 'completed' && (
                            <button onClick={() => setSelectedMatchForDetail(match)} className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black uppercase text-[11px] hover:bg-gray-200 transition-colors">VIEW MATCH REPORT</button>
                          )}

                          {(isAdmin || isProposer) && match.status === 'proposal' && (
                            <button onClick={() => handleCancelMatch(match.id)} className="bg-gray-100 text-gray-400 px-4 py-4 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all">
                               <i className="fas fa-trash-alt"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>
            )}

            {activeTab === 'pitches' && (
              <div key="pitches" className="space-y-6 animate-fadeIn">
                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                  <h2 className="text-2xl font-black italic text-sunNavy uppercase mb-6 tracking-tighter">Manage Pitches</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Pitch Name</label>
                      <input type="text" placeholder="e.g. Central Arena" value={newPitch.name || ''} onChange={e => setNewPitch({...newPitch, name: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy shadow-inner transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Phone</label>
                      <input type="text" placeholder="Phone Number" value={newPitch.contact?.phone || ''} onChange={e => setNewPitch({...newPitch, contact: {...(newPitch.contact || {}), phone: e.target.value}})} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy shadow-inner transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">WhatsApp</label>
                      <input type="text" placeholder="WhatsApp Number" value={newPitch.contact?.whatsapp || ''} onChange={e => setNewPitch({...newPitch, contact: {...(newPitch.contact || {}), whatsapp: e.target.value}})} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy shadow-inner transition-all" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleSavePitch} className="bg-sunNavy text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest italic flex items-center gap-3">
                      <i className="fas fa-save"></i> {editingPitchId ? 'Update Pitch' : 'Add New Pitch'}
                    </button>
                    {editingPitchId && <button onClick={() => { setEditingPitchId(null); setNewPitch({name: '', contact: {}}); }} className="bg-gray-100 text-gray-500 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pitches.map(pitch => (
                    <div key={pitch.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden flex flex-col hover:shadow-lg transition-all">
                      <div className="h-40 bg-gray-200 relative overflow-hidden">
                        <iframe 
                          key={pitch.id}
                          className="w-full h-full grayscale-[0.3] border-0"
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/search?key=${process.env.API_KEY || ''}&q=${encodeURIComponent(pitch.location ? `${pitch.location.lat},${pitch.location.lng}` : pitch.name)}`}
                        ></iframe>
                        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute top-4 right-4 z-10">
                           <div className="bg-sunYellow text-sunNavy px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-md flex items-center gap-2">
                             <i className="fas fa-star"></i> {pitch.location ? 'VERIFIED' : 'APPROX'}
                           </div>
                        </div>
                      </div>
                      
                      <div className="p-7 pt-2 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="text-xl font-black text-gray-800 uppercase italic mb-4 leading-tight">{pitch.name}</h3>
                          <div className="space-y-3 mb-6">
                            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-3 tracking-widest"><i className="fas fa-phone text-sunNavy w-4"></i> {pitch.contact?.phone || 'NOT SET'}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-3 tracking-widest"><i className="fab fa-whatsapp text-green-500 w-4"></i> {pitch.contact?.whatsapp || 'NOT SET'}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pitch.location ? `${pitch.location.lat},${pitch.location.lng}` : pitch.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-sunNavy text-white py-4 rounded-xl text-[10px] font-black uppercase text-center hover:bg-sunNavy/90 transition-all flex items-center justify-center gap-3 shadow-lg tracking-widest"
                          >
                            GET DIRECTIONS <i className="fas fa-directions"></i>
                          </a>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingPitchId(pitch.id); setNewPitch(pitch); }} className="flex-1 bg-gray-50 text-sunNavy py-3 rounded-xl text-[10px] font-black uppercase hover:bg-sunYellow/10 transition-colors tracking-widest">Edit Details</button>
                            <button onClick={() => handleDeletePitch(pitch.id)} className="p-3 text-gray-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'manage-players' && (
              <div key="manage-players" className="space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-black italic text-sunNavy uppercase">Squad Pool</h2>
                      <span className="bg-sunNavy text-white px-3 py-1 rounded-full text-[10px] font-black">
                        {finalSearchedPlayers.length} / {players.length} TOTAL
                      </span>
                    </div>
                    {isAdmin && <button onClick={() => setShowPlayerModal(true)} className="bg-sunNavy text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg">Add Player</button>}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input 
                        type="text" 
                        placeholder="Search by name or position..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-sunYellow outline-none font-bold text-sm transition-all text-sunNavy" 
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <select 
                        value={filterPosition} 
                        onChange={(e) => setFilterPosition(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase text-sunNavy outline-none cursor-pointer hover:bg-gray-100"
                      >
                        <option value="All">Positions</option>
                        <option value="Kaleci">GK</option>
                        <option value="Defans">DEF</option>
                        <option value="Orta Saha">MID</option>
                        <option value="Forvet">FWD</option>
                      </select>

                      <select 
                        value={filterAge} 
                        onChange={(e) => setFilterAge(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase text-sunNavy outline-none cursor-pointer hover:bg-gray-100"
                      >
                        <option value="All">Age Range</option>
                        <option value="18-25">18-25</option>
                        <option value="26-30">26-30</option>
                        <option value="31-35">31-35</option>
                        <option value="35+">35+</option>
                      </select>

                      <select 
                        value={filterRating} 
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase text-sunNavy outline-none cursor-pointer hover:bg-gray-100"
                      >
                        <option value="All">Rating</option>
                        <option value="<50">&lt;50</option>
                        <option value="50-69">50-69</option>
                        <option value="70-89">70-89</option>
                        <option value="90+">90+</option>
                      </select>

                      <select 
                        value={sortOption} 
                        onChange={(e) => setSortOption(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase text-sunNavy outline-none cursor-pointer hover:bg-gray-100 flex-1 min-w-[120px]"
                      >
                        <option value="rating-desc">Rating (High → Low)</option>
                        <option value="rating-asc">Rating (Low → High)</option>
                        <option value="age-asc">Age (Young → Old)</option>
                        <option value="age-desc">Age (Old → Young)</option>
                        <option value="name-asc">Name (A → Z)</option>
                        <option value="name-desc">Name (Z → A)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finalSearchedPlayers.map(p => (
                    <PlayerCard 
                      key={p.id} 
                      player={p} 
                      onEdit={isAdmin ? (p) => { setEditingPlayer(p); setShowPlayerModal(true); } : undefined} 
                      onClick={() => setSelectedPlayerIdForDetail(p.id)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div key="history" className="space-y-6 animate-fadeIn">
                {(matches || []).filter(m => m.status === 'completed').map(m => (
                  <div key={m.id} onClick={() => setSelectedMatchForDetail(m)} className="bg-white p-6 rounded-3xl flex justify-between items-center border border-gray-100 shadow-sm cursor-pointer hover:border-sunYellow transition-all gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-3 border-r">
                        <p className="text-[9px] font-black text-gray-300 uppercase">{m.date?.split('-')[1] || '--'}</p>
                        <p className="text-lg font-black text-sunNavy leading-none">{m.date?.split('-')[2] || '--'}</p>
                      </div>
                      <div>
                        <p className="font-black text-gray-800 italic uppercase text-sm">{m.location}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{m.format}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-2xl md:text-4xl font-black text-sunNavy">{m.scoreA || 0}</span>
                       <span className="text-lg font-bold text-gray-200">-</span>
                       <span className="text-2xl md:text-4xl font-black text-sunYellow">{m.scoreB || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'profile' && currentUser && (
              <div key="profile" className="animate-fadeIn max-w-2xl mx-auto space-y-6 pb-12">
                 <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="h-32 bg-sunNavy w-full relative overflow-hidden">
                      <div className="absolute inset-0 soccer-bg opacity-20"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
                    </div>
                    <div className="px-8 pb-8 flex flex-col items-center -mt-16 text-center relative z-10">
                       <div className={`w-36 h-36 rounded-[2.5rem] border-4 border-white shadow-2xl overflow-hidden relative group mb-6 transition-transform hover:scale-105 ${isEditingProfile ? 'cursor-pointer' : ''}`} onClick={() => isEditingProfile && profileFileInputRef.current?.click()}>
                         <img src={profileEditData.photoUrl || currentUser.photoUrl} className="w-full h-full object-cover" />
                         {isEditingProfile && (
                           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <i className="fas fa-camera text-white text-3xl"></i>
                           </div>
                         )}
                         <input type="file" ref={profileFileInputRef} onChange={handleProfilePhotoUpload} accept="image/*" className="hidden" />
                       </div>
                       
                       <h2 className="text-4xl font-black text-sunNavy uppercase italic leading-none mb-8 tracking-tighter">
                         {isEditingProfile ? (
                           <input 
                             type="text" 
                             value={profileEditData.name || currentUser.name} 
                             onChange={e => setProfileEditData(prev => ({ ...prev, name: e.target.value }))}
                             className="text-center bg-gray-50 border-2 border-sunYellow rounded-2xl px-6 py-2 outline-none w-full max-w-md shadow-inner font-black uppercase italic"
                             placeholder="NAME SURNAME"
                           />
                         ) : currentUser.name}
                       </h2>

                       {isEditingProfile && (
                         <div className="w-full max-w-xl grid grid-cols-2 gap-4 mb-8 text-left">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Birth Date</label>
                              <input type="date" value={profileEditData.birthDate || currentUser.birthDate || ''} onChange={e => setProfileEditData(prev => ({ ...prev, birthDate: e.target.value }))} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl outline-none font-bold text-sunNavy text-sm shadow-inner" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nationality</label>
                              <select value={profileEditData.nationality || currentUser.nationality || 'Türkiye'} onChange={e => setProfileEditData(prev => ({ ...prev, nationality: e.target.value }))} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl outline-none font-bold text-sunNavy text-sm shadow-inner">
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Height (cm)</label>
                              <input type="number" placeholder="180" value={profileEditData.height || currentUser.height || ''} onChange={e => setProfileEditData(prev => ({ ...prev, height: parseInt(e.target.value) }))} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl outline-none font-bold text-sunNavy text-sm shadow-inner" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Weight (kg)</label>
                              <input type="number" placeholder="75" value={profileEditData.weight || currentUser.weight || ''} onChange={e => setProfileEditData(prev => ({ ...prev, weight: parseInt(e.target.value) }))} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl outline-none font-bold text-sunNavy text-sm shadow-inner" />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Preferred Foot</label>
                              <select value={profileEditData.preferredFoot || currentUser.preferredFoot || 'Sağ'} onChange={e => setProfileEditData(prev => ({ ...prev, preferredFoot: e.target.value as any }))} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl outline-none font-bold text-sunNavy text-sm shadow-inner">
                                <option value="Sağ">Right</option>
                                <option value="Sol">Left</option>
                                <option value="Her İkisi">Both</option>
                              </select>
                            </div>
                         </div>
                       )}

                       <div className="flex gap-4 mb-4">
                         {!isEditingProfile ? (
                           <button onClick={() => setIsEditingProfile(true)} className="bg-gray-100 text-sunNavy px-10 py-4 rounded-[1.5rem] text-[11px] font-black flex items-center gap-2 hover:bg-sunYellow transition-all uppercase shadow-md active:scale-95">
                             <i className="fas fa-user-edit"></i> Edit Profile
                           </button>
                         ) : (
                           <div className="flex gap-4">
                             <button onClick={() => { setIsEditingProfile(false); setProfileEditData({}); }} className="bg-gray-100 text-gray-400 px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase shadow-sm hover:bg-gray-200 transition-colors active:scale-95">
                               Cancel
                             </button>
                             <button onClick={handleUpdateProfile} className="bg-sunNavy text-white px-12 py-4 rounded-[1.5rem] text-[11px] font-black uppercase shadow-lg hover:bg-sunNavy/90 active:scale-95 transition-all">
                               Save Changes
                             </button>
                           </div>
                         )}
                       </div>
                    </div>
                 </div>
                 <PlayerCard player={currentUser} showStats={true} />
              </div>
            )}

            {activeTab === 'propose' && (
              <div key="propose" className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl space-y-8 animate-fadeIn border border-gray-100">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-sunNavy italic uppercase tracking-tighter">Match Proposal</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Date</label>
                        <input type="date" value={proposalDate} onChange={e=>setProposalDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-sunYellow outline-none font-bold text-sunNavy shadow-inner"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Time</label>
                        <input type="time" value={proposalTime} onChange={e=>setProposalTime(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-sunYellow outline-none font-bold text-sunNavy shadow-inner"/>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pitch Selection</label>
                        <button onClick={() => setActiveTab('pitches')} className="text-[10px] font-black text-sunNavy hover:text-sunYellow transition-colors uppercase underline tracking-tighter">Manage Pitches</button>
                    </div>
                    <div className="relative">
                      <select value={proposalLocation} onChange={e=>setProposalLocation(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-sunYellow outline-none font-bold text-sunNavy cursor-pointer appearance-none shadow-inner">
                        <option value="">Select a pitch...</option>
                        {pitches.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Match Format</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['5v5', '6v6', '7v7', '8v8', '9v9', '10v10'].map(fmt => (
                            <button key={fmt} onClick={() => setProposalFormat(fmt as MatchFormat)} className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${proposalFormat === fmt ? 'bg-sunNavy text-white border-sunNavy shadow-md' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'}`}>{fmt}</button>
                        ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleProposeSubmit} className="w-full bg-sunYellow text-sunNavy py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] transition-all uppercase italic tracking-widest">SUBMIT PROPOSAL</button>
              </div>
            )}
          </AnimatePresence>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-around items-center z-[80] rounded-t-[2.5rem] shadow-2xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-sunNavy' : 'text-gray-300'}`}>
          <i className="fas fa-futbol text-lg"></i>
          <span className="text-[8px] font-black uppercase">Matches</span>
        </button>
        <button onClick={() => setActiveTab('manage-players')} className={`flex flex-col items-center gap-1 ${activeTab === 'manage-players' ? 'text-sunNavy' : 'text-gray-300'}`}>
          <i className="fas fa-users text-lg"></i>
          <span className="text-[8px] font-black uppercase">Squad</span>
        </button>
        <button onClick={() => setActiveTab('pitches')} className={`flex flex-col items-center gap-1 ${activeTab === 'pitches' ? 'text-sunNavy' : 'text-gray-300'}`}>
          <i className="fas fa-map-marked-alt text-lg"></i>
          <span className="text-[8px] font-black uppercase">Pitches</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-sunNavy' : 'text-gray-300'}`}>
          <i className="fas fa-history text-lg"></i>
          <span className="text-[8px] font-black uppercase">History</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-sunNavy' : 'text-gray-300'}`}>
          <i className="fas fa-user-circle text-lg"></i>
          <span className="text-[8px] font-black uppercase">Profile</span>
        </button>
      </nav>
      
      {/* Modals and Overlays */}
      {showPlayerModal && <PlayerModal player={editingPlayer} onClose={() => { setShowPlayerModal(false); setEditingPlayer(undefined); }} onSave={async (p) => { await dbService.savePlayer(p); setShowPlayerModal(false); setEditingPlayer(undefined); fetchPlayers(); }} />}
      {selectedPlayerIdForDetail && <PlayerDetailModal player={players.find(p => p.id === selectedPlayerIdForDetail)!} currentUser={currentUser} matches={matches} onClose={() => setSelectedPlayerIdForDetail(null)} />}
      {selectedMatchForDetail && <MatchDetailModal match={selectedMatchForDetail} onClose={() => setSelectedMatchForDetail(null)} onPlayerClick={p => setSelectedPlayerIdForDetail(p.id)} />}
      {finishingMatch && <MatchFinalizationModal match={finishingMatch} onClose={() => setFinishingMatch(null)} onSave={handleFinalizeMatchResults} />}
    </div>
  );
};

export default App;
