
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Match } from '../types';
import PlayerCard from './PlayerCard';

interface TeamBuilderProps {
  players: Player[];
  organizerId: string;
  currentUser: Player | null; // Added currentUser to reliably check permissions
  onTeamCreated: (teamA: Player[], teamB: Player[]) => void;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ players = [], organizerId, currentUser, onTeamCreated }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto');
  const [manualA, setManualA] = useState<string[]>([]);
  const [manualB, setManualB] = useState<string[]>([]);
  const [dummies, setDummies] = useState<Player[]>([]);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStadiumAnim, setShowStadiumAnim] = useState(false);
  const [draftedTeams, setDraftedTeams] = useState<{ teamA: Player[], teamB: Player[] } | null>(null);

  const allAvailablePlayers = useMemo(() => [...(players || []), ...(dummies || [])], [players, dummies]);
  const poolPlayers = allAvailablePlayers.filter(p => selectedIds.includes(p.id));
  const unassignedPlayers = poolPlayers.filter(p => !manualA.includes(p.id) && !manualB.includes(p.id));

  const isOrganizer = useMemo(() => {
    return currentUser?.id === organizerId;
  }, [currentUser, organizerId]);

  const togglePool = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      setManualA(manualA.filter(i => i !== id));
      setManualB(manualB.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const addDummyGK = () => {
    const dummyId = `dummy_${Math.random().toString(36).substr(2, 9)}`;
    const newDummy: Player = {
      id: dummyId,
      name: `GK Guest ${dummies.length + 1}`,
      photoUrl: 'https://avatar.iran.liara.run/public/job/doctor/male',
      position: 'Kaleci',
      rating: 50,
      marketValue: 0,
      attributes: { pace: 40, shooting: 30, passing: 45, dribbling: 30, defending: 65, physical: 60 },
      matchesPlayed: 0,
      matchesOrganized: 0,
      goals: 0,
      assists: 0,
      consecutiveMatches: 0,
      role: 'player',
      isDummy: true
    };
    setDummies(prev => [...prev, newDummy]);
    setSelectedIds(prev => [...prev, dummyId]);
  };

  const assignToTeam = (id: string, team: 'A' | 'B' | 'pool') => {
    setManualA(manualA.filter(i => i !== id));
    setManualB(manualB.filter(i => i !== id));
    if (team === 'A') setManualA([...manualA, id]);
    if (team === 'B') setManualB([...manualB, id]);
  };

  const handleStartDrafting = () => {
    let teamA: Player[] = [];
    let teamB: Player[] = [];

    if (assignmentMode === 'auto') {
      const positions: Player['position'][] = ['Kaleci', 'Defans', 'Orta Saha', 'Forvet'];
      let toggle = true;
      positions.forEach(pos => {
        const positionalGroup = poolPlayers
          .filter(p => p.position === pos)
          .sort((a, b) => b.rating - a.rating);
        positionalGroup.forEach(p => {
          if (toggle) teamA.push(p);
          else teamB.push(p);
          toggle = !toggle;
        });
      });
    } else {
      teamA = allAvailablePlayers.filter(p => manualA.includes(p.id));
      teamB = allAvailablePlayers.filter(p => manualB.includes(p.id));
    }

    setDraftedTeams({ teamA, teamB });
    setShowConfirm(true);
  };

  const getStats = (team: Player[]) => {
    if (!team || team.length === 0) return { avgRating: 0, totalValue: 0 };
    const avgRating = Math.round(team.reduce((acc, p) => acc + (p?.rating || 0), 0) / team.length);
    const totalValue = team.reduce((acc, p) => acc + (p?.marketValue || 0), 0);
    return { avgRating, totalValue };
  };

  const finalizeMatch = () => {
    if (draftedTeams) onTeamCreated(draftedTeams.teamA, draftedTeams.teamB);
    setShowStadiumAnim(false);
  };

  const getPitchPosition = (player: Player, team: Player[], isTeamA: boolean) => {
    const teamInPos = team.filter(p => p.position === player.position);
    const indexInPos = teamInPos.indexOf(player);
    const totalInPos = teamInPos.length;
    
    const x = 15 + (70 / (totalInPos + 1)) * (indexInPos + 1);
    
    let y = 0;
    if (isTeamA) {
      if (player.position === 'Kaleci') y = 7;
      else if (player.position === 'Defans') y = 18;
      else if (player.position === 'Orta Saha') y = 29;
      else if (player.position === 'Forvet') y = 40;
    } else {
      if (player.position === 'Kaleci') y = 93;
      else if (player.position === 'Defans') y = 82;
      else if (player.position === 'Orta Saha') y = 71;
      else if (player.position === 'Forvet') y = 60;
    }

    return { x: `${x}%`, y: `${y}%` };
  };

  const statsA = draftedTeams ? getStats(draftedTeams.teamA) : { avgRating: 0, totalValue: 0 };
  const statsB = draftedTeams ? getStats(draftedTeams.teamB) : { avgRating: 0, totalValue: 0 };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-sunNavy text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg">
              <i className="fas fa-users-cog"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-sunNavy uppercase italic tracking-tighter">Squad Engineering</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{selectedIds.length} Players Selected</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-center">
             <button 
                onClick={addDummyGK}
                className="bg-gray-100 text-gray-600 px-4 py-3 rounded-xl text-[10px] font-black hover:bg-gray-200 transition-all border-2 border-dashed border-gray-300 flex items-center gap-2"
             >
               <i className="fas fa-plus"></i> ADD DUMMY GK
             </button>
             <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setAssignmentMode('auto')}
                className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${assignmentMode === 'auto' ? 'bg-white shadow-md text-sunNavy' : 'text-gray-400'}`}
              >
                AUTO (AI)
              </button>
              <button 
                onClick={() => setAssignmentMode('manual')}
                className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${assignmentMode === 'manual' ? 'bg-white shadow-md text-sunNavy' : 'text-gray-400'}`}
              >
                MANUAL
              </button>
            </div>
          </div>

          <button 
            onClick={handleStartDrafting}
            disabled={selectedIds.length < 2 || (assignmentMode === 'manual' && unassignedPlayers.length > 0)}
            className="bg-sunYellow text-sunNavy px-12 py-4 rounded-[1.5rem] font-black shadow-xl hover:scale-105 disabled:opacity-30 transition-all uppercase italic text-sm"
          >
            {assignmentMode === 'manual' && unassignedPlayers.length > 0 ? `${unassignedPlayers.length} UNASSIGNED` : 'ANALYZE'}
          </button>
        </div>
      </div>

      {assignmentMode === 'manual' && selectedIds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="bg-sunNavy/5 p-6 rounded-[2.5rem] border-2 border-sunNavy/20 space-y-4">
            <h3 className="text-center font-black text-sunNavy uppercase italic">TEAM A ({manualA.length})</h3>
            <div className="space-y-2 min-h-[100px]">
              {manualA.map(id => {
                const p = allAvailablePlayers.find(pl => pl.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-sunNavy/10">
                    <span className="text-xs font-bold">{p.name} {p.isDummy && '(G)'}</span>
                    <button onClick={() => assignToTeam(id, 'pool')} className="text-sunNavy/40 hover:text-red-500"><i className="fas fa-times"></i></button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-[2.5rem] space-y-4">
             <h3 className="text-center font-black text-gray-500 uppercase italic">POOL ({unassignedPlayers.length})</h3>
             <div className="grid grid-cols-1 gap-2">
               {unassignedPlayers.map(p => (
                 <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-gray-200">
                    <div className="flex items-center gap-3">
                       <img src={p.photoUrl} className="w-8 h-8 rounded-lg object-cover" />
                       <span className="text-xs font-black">{p.name} {p.isDummy && '(G)'}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => assignToTeam(p.id, 'A')} className="bg-sunNavy text-white px-3 py-1 rounded-lg text-[10px] font-black">A</button>
                      <button onClick={() => assignToTeam(p.id, 'B')} className="bg-sunYellow text-sunNavy px-3 py-1 rounded-lg text-[10px] font-black">B</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="bg-sunYellow/5 p-6 rounded-[2.5rem] border-2 border-sunYellow/30 space-y-4">
            <h3 className="text-center font-black text-sunYellow uppercase italic">TEAM B ({manualB.length})</h3>
            <div className="space-y-2 min-h-[100px]">
              {manualB.map(id => {
                const p = allAvailablePlayers.find(pl => pl.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-sunYellow/10">
                    <span className="text-xs font-bold text-gray-700">{p.name} {p.isDummy && '(G)'}</span>
                    <button onClick={() => assignToTeam(id, 'pool')} className="text-sunYellow/40 hover:text-red-500"><i className="fas fa-times"></i></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allAvailablePlayers.map(player => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            selected={selectedIds.includes(player.id)}
            onClick={() => togglePool(player.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {showConfirm && draftedTeams && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
              <div className="bg-sunNavy text-white p-10 flex justify-between items-center shrink-0">
                <div>
                   <h2 className="text-3xl font-black italic uppercase tracking-tighter">Balance Analysis</h2>
                   <p className="text-sunYellow text-xs font-bold uppercase tracking-[0.2em] mt-1">Match Quality: %{Math.max(0, 100 - Math.abs(statsA.avgRating - statsB.avgRating) * 5)}</p>
                </div>
                <button onClick={() => setShowConfirm(false)} className="text-2xl hover:rotate-90 transition-transform"><i className="fas fa-times"></i></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                <div className="space-y-6">
                   <div className="flex justify-between items-end mb-2">
                      <div className="text-left">
                         <span className="text-[10px] font-black text-sunNavy uppercase">TEAM A POWER</span>
                         <p className="text-5xl font-black text-sunNavy">{statsA.avgRating}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-black text-sunYellow uppercase">TEAM B POWER</span>
                         <p className="text-5xl font-black text-sunYellow">{statsB.avgRating}</p>
                      </div>
                   </div>
                   <div className="h-4 w-full bg-gray-100 rounded-full flex overflow-hidden shadow-inner">
                      <div className="h-full bg-sunNavy transition-all duration-1000" style={{ width: `${(statsA.avgRating / (statsA.avgRating + statsB.avgRating || 1)) * 100}%` }}></div>
                      <div className="h-full bg-sunYellow transition-all duration-1000" style={{ width: `${(statsB.avgRating / (statsA.avgRating + statsB.avgRating || 1)) * 100}%` }}></div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                     <h4 className="text-sunNavy font-black italic border-b-2 border-sunNavy/10 pb-2 uppercase">SQUAD A</h4>
                     <div className="grid grid-cols-1 gap-2">
                        {(draftedTeams?.teamA || []).map(p => (
                           <div key={p.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                 <img src={p.photoUrl} className="w-10 h-10 rounded-xl object-cover" />
                                 <div><p className="text-xs font-black">{p.name} {p.isDummy && '(G)'}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{p.position}</p></div>
                              </div>
                              <span className="font-black text-sunNavy">{p.rating}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-sunYellow font-black italic border-b-2 border-sunYellow/20 pb-2 uppercase">SQUAD B</h4>
                     <div className="grid grid-cols-1 gap-2">
                        {(draftedTeams?.teamB || []).map(p => (
                           <div key={p.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                 <img src={p.photoUrl} className="w-10 h-10 rounded-xl object-cover" />
                                 <div><p className="text-xs font-black">{p.name} {p.isDummy && '(G)'}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{p.position}</p></div>
                              </div>
                              <span className="font-black text-sunYellow">{p.rating}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-gray-50 border-t flex gap-6 shrink-0">
                 <button onClick={() => setShowConfirm(false)} className="flex-1 py-5 font-black text-gray-400 uppercase tracking-widest text-xs">EDIT</button>
                 {/* Fixed: Reliable organizer ID check against currentUser object */}
                 {isOrganizer ? (
                    <button onClick={() => { setShowConfirm(false); setShowStadiumAnim(true); }} className="flex-[2] bg-sunNavy text-white py-5 rounded-[2rem] font-black shadow-2xl uppercase italic tracking-widest text-lg transition-transform hover:scale-105 active:scale-95">START MATCH</button>
                 ) : (
                    <div className="flex-[2] flex flex-col items-center justify-center text-gray-400 bg-gray-100 rounded-[2rem]">
                      <span className="text-[10px] font-black uppercase tracking-widest">Waiting for Organizer</span>
                      <p className="text-[8px] italic font-bold text-center px-4">Only the match proposer ({players.find(p => p.id === organizerId)?.name || 'Organizer'}) can start the game.</p>
                    </div>
                 )}
              </div>
            </div>
          </motion.div>
        )}

        {showStadiumAnim && draftedTeams && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#001500] z-[300] flex flex-col items-center justify-center overflow-hidden">
            <button onClick={finalizeMatch} className="absolute top-10 right-10 z-[400] bg-white text-sunNavy w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform font-black"><i className="fas fa-times text-2xl"></i></button>

            <style>{`
              @keyframes floatPlayer {
                0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); }
                50% { transform: translate(-50%, -50%) translateY(-6px) scale(1.02); }
              }
              .pitch-canvas {
                background: linear-gradient(180deg, #166534 0%, #064e3b 100%);
                background-image: 
                  repeating-linear-gradient(90deg, transparent, transparent 8%, rgba(255,255,255,0.04) 8%, rgba(255,255,255,0.04) 16%),
                  radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 80%);
              }
            `}</style>

            <div className="relative w-[95vw] h-[85vh] max-w-[850px] border-[12px] border-white/40 rounded-[4.5rem] pitch-canvas shadow-[0_0_250px_rgba(0,0,0,1)] overflow-hidden">
               <div className="absolute top-1/2 left-0 w-full h-[4px] bg-white/30"></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[4px] border-white/30 rounded-full"></div>

               {(draftedTeams?.teamA || []).map((p, i) => {
                 const pos = getPitchPosition(p, draftedTeams.teamA, true);
                 return (
                   <motion.div key={`final-a-${p.id}`} initial={{ scale: 0, opacity: 0, top: "0%", left: "50%" }} animate={{ scale: 1, opacity: 1, top: pos.y, left: pos.x }} className="absolute flex flex-col items-center z-20 group player-node" style={{ transform: 'translate(-50%, -50%)' }}>
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] border-[3px] border-white shadow-[0_15px_30px_rgba(0,0,0,0.7)] overflow-hidden bg-sunNavy ${p.isDummy ? 'border-dashed' : ''}`}>
                        <img src={p.photoUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-sunNavy/95 backdrop-blur-md text-white text-[8px] sm:text-[10px] px-3 py-1 rounded-full mt-2 font-black shadow-2xl border border-white/40 whitespace-nowrap uppercase tracking-tighter">
                        {(p.name || 'Player').split(' ')[0]} {p.isDummy && '(G)'}
                      </div>
                   </motion.div>
                 );
               })}

               {(draftedTeams?.teamB || []).map((p, i) => {
                 const pos = getPitchPosition(p, draftedTeams.teamB, false);
                 return (
                   <motion.div key={`final-b-${p.id}`} initial={{ scale: 0, opacity: 0, top: "100%", left: "50%" }} animate={{ scale: 1, opacity: 1, top: pos.y, left: pos.x }} className="absolute flex flex-col items-center z-20 group player-node" style={{ transform: 'translate(-50%, -50%)' }}>
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] border-[3px] border-white shadow-[0_15px_30px_rgba(0,0,0,0.7)] overflow-hidden bg-sunYellow ${p.isDummy ? 'border-dashed' : ''}`}>
                        <img src={p.photoUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-sunYellow/95 backdrop-blur-md text-sunNavy text-[8px] sm:text-[10px] px-3 py-1 rounded-full mt-2 font-black shadow-2xl border border-white/40 whitespace-nowrap uppercase tracking-tighter">
                        {(p.name || 'Player').split(' ')[0]} {p.isDummy && '(G)'}
                      </div>
                   </motion.div>
                 );
               })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamBuilder;
