
import React, { useState, useEffect } from 'react';
import { Match, Player, PlayerMatchStats, GoalType } from '../types';

interface MatchFinalizationModalProps {
  match: Match;
  onClose: () => void;
  onSave: (match: Match, scoreA: number, scoreB: number, playerStats: PlayerMatchStats[]) => void;
}

const MatchFinalizationModal: React.FC<MatchFinalizationModalProps> = ({ match, onClose, onSave }) => {
  const [step, setStep] = useState<'attendance' | 'stats'>('attendance');
  const [presentPlayerIds, setPresentPlayerIds] = useState<string[]>(
    [...match.teamA, ...match.teamB].map(p => p.id)
  );
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [pulseA, setPulseA] = useState(false);
  const [pulseB, setPulseB] = useState(false);
  
  const [stats, setStats] = useState<Record<string, PlayerMatchStats>>({});
  const [showInjuryForm, setShowInjuryForm] = useState<string | null>(null);

  useEffect(() => {
    const initialStats = [...match.teamA, ...match.teamB]
      .filter(p => presentPlayerIds.includes(p.id))
      .reduce((acc, p) => ({
        ...acc,
        [p.id]: {
          playerId: p.id,
          goals: 0,
          goalDetails: [] as GoalType[],
          assists: 0,
          matchRating: 6.0,
          conceded: 0,
          saves: 0,
          interceptions: 0,
          injuryDetail: '',
          injuryDuration: 0
        }
      }), {} as Record<string, PlayerMatchStats>);
    setStats(initialStats);
  }, [presentPlayerIds, match.teamA, match.teamB]);

  useEffect(() => {
    setStats(prev => {
      const newStats = { ...prev };
      match.teamA.forEach(p => {
        if (p.position === 'Kaleci' && newStats[p.id]) newStats[p.id].conceded = scoreB;
      });
      match.teamB.forEach(p => {
        if (p.position === 'Kaleci' && newStats[p.id]) newStats[p.id].conceded = scoreA;
      });
      return newStats;
    });
    
    setPulseA(true);
    const timerA = setTimeout(() => setPulseA(false), 300);
    return () => clearTimeout(timerA);
  }, [scoreA, match.teamA, match.teamB, scoreB]);

  useEffect(() => {
    setPulseB(true);
    const timerB = setTimeout(() => setPulseB(false), 300);
    return () => clearTimeout(timerB);
  }, [scoreB]);

  const toggleAttendance = (id: string) => {
    setPresentPlayerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculateRating = (p: Player, s: PlayerMatchStats) => {
    let rating = 6.0;
    const weights = {
      Kaleci: { goal: 4.5, assist: 3.0, save: 0.8, base: 6.5 },
      Defans: { goal: 3.0, assist: 2.2, interception: 0.5, base: 6.2 },
      'Orta Saha': { goal: 1.8, assist: 1.8, interception: 0.3, base: 6.0 },
      Forvet: { goal: 1.2, assist: 1.2, interception: 0.2, base: 5.8 }
    };
    const w = (weights as any)[p.position];
    rating = w.base;

    s.goalDetails?.forEach(g => {
      let bonus = w.goal;
      if (g === 'Freekick') bonus += 0.7;
      if (g === 'Kafa') bonus += 0.4;
      rating += bonus;
    });

    rating += s.assists * w.assist;
    if (p.position === 'Kaleci') {
      rating += (s.saves || 0) * w.save;
      rating -= (s.conceded || 0) * 0.5;
    } else {
      rating += (s.interceptions || 0) * (w.interception || 0.2);
    }
    if (s.injuryDuration && s.injuryDuration > 0) rating -= 1.0;
    
    return Math.min(10, Math.max(1, Number(rating.toFixed(1))));
  };

  const addGoal = (playerId: string, type: GoalType) => {
    const isTeamA = match.teamA.some(p => p.id === playerId);
    if (isTeamA) setScoreA(prev => prev + 1);
    else setScoreB(prev => prev + 1);

    setStats(prev => {
      const pStats = prev[playerId];
      const newDetails = [...(pStats.goalDetails || []), type];
      const updated = { ...pStats, goals: newDetails.length, goalDetails: newDetails };
      const player = [...match.teamA, ...match.teamB].find(p => p.id === playerId)!;
      updated.matchRating = calculateRating(player, updated);
      return { ...prev, [playerId]: updated };
    });
  };

  const removeGoal = (playerId: string, index: number) => {
    const isTeamA = match.teamA.some(p => p.id === playerId);
    if (isTeamA) setScoreA(prev => Math.max(0, prev - 1));
    else setScoreB(prev => Math.max(0, prev - 1));

    setStats(prev => {
      const pStats = prev[playerId];
      const newDetails = [...(pStats.goalDetails || [])];
      newDetails.splice(index, 1);
      const updated = { ...pStats, goals: newDetails.length, goalDetails: newDetails };
      const player = [...match.teamA, ...match.teamB].find(p => p.id === playerId)!;
      updated.matchRating = calculateRating(player, updated);
      return { ...prev, [playerId]: updated };
    });
  };

  const updateNumericStat = (playerId: string, field: 'assists' | 'saves' | 'interceptions', val: number) => {
    setStats(prev => {
      const updated = { ...prev[playerId], [field]: val };
      const player = [...match.teamA, ...match.teamB].find(p => p.id === playerId)!;
      updated.matchRating = calculateRating(player, updated);
      return { ...prev, [playerId]: updated };
    });
  };

  const handleInjuryUpdate = (playerId: string, detail: string, duration: number) => {
    setStats(prev => {
      const updated = { ...prev[playerId], injuryDetail: detail, injuryDuration: duration };
      const player = [...match.teamA, ...match.teamB].find(p => p.id === playerId)!;
      updated.matchRating = calculateRating(player, updated);
      return { ...prev, [playerId]: updated };
    });
  };

  const renderPlayerRow = (p: Player) => {
    const pStats = stats[p.id];
    if (!pStats) return null;

    return (
      <div key={p.id} className={`flex flex-col p-4 bg-white rounded-2xl border ${p.isDummy ? 'border-dashed border-gray-200' : 'border-gray-100'} shadow-sm gap-3 mb-2 animate-fadeIn`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
            <div>
              <p className="text-sm font-black">{p.name} {p.isDummy && '(GUEST)'}</p>
              <p className="text-[10px] text-sunNavy font-bold">RATING: {pStats.matchRating} 
                {pStats.injuryDuration ? <span className="ml-2 text-red-500"><i className="fas fa-hand-holding-medical"></i> INJURED</span> : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!p.isDummy && (
              <button 
                onClick={() => setShowInjuryForm(showInjuryForm === p.id ? null : p.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${pStats.injuryDuration ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:text-red-500'}`}
                title="Report Injury"
              >
                <i className="fas fa-medkit text-xs"></i>
              </button>
            )}
            <div className="text-center">
              <label className="text-[8px] font-black text-gray-400 uppercase">AST</label>
              <div className="flex items-center gap-1 bg-gray-50 rounded p-1">
                <button type="button" onClick={() => updateNumericStat(p.id, 'assists', Math.max(0, pStats.assists - 1))} className="w-4 h-4 text-xs">-</button>
                <span className="text-xs font-bold w-3 text-center">{pStats.assists}</span>
                <button type="button" onClick={() => updateNumericStat(p.id, 'assists', pStats.assists + 1)} className="w-4 h-4 text-xs">+</button>
              </div>
            </div>
          </div>
        </div>

        {showInjuryForm === p.id && !p.isDummy && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 space-y-2 animate-fadeIn">
             <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="text-[8px] font-black text-red-800 uppercase">Injury Detail</label>
                   <input type="text" placeholder="e.g. Hamstring" value={pStats.injuryDetail} onChange={e => handleInjuryUpdate(p.id, e.target.value, pStats.injuryDuration || 0)} className="w-full text-[10px] p-1.5 rounded border-none outline-none font-bold" />
                </div>
                <div>
                   <label className="text-[8px] font-black text-red-800 uppercase">Duration (Weeks)</label>
                   <input type="number" min="0" value={pStats.injuryDuration || 0} onChange={e => handleInjuryUpdate(p.id, pStats.injuryDetail || '', parseInt(e.target.value) || 0)} className="w-full text-[10px] p-1.5 rounded border-none outline-none font-bold" />
                </div>
             </div>
             <button onClick={() => setShowInjuryForm(null)} className="w-full text-[8px] font-black text-red-600 uppercase hover:underline">Save & Close</button>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          {(['Ayak', 'Kafa', 'Freekick', 'Penaltı'] as GoalType[]).map(type => (
            <button key={type} type="button" onClick={() => addGoal(p.id, type)} className="text-[8px] font-black bg-gray-50 hover:bg-sunYellow/20 px-2 py-1 rounded border border-gray-100 transition-colors uppercase">+ {type === 'Ayak' ? 'Foot' : type === 'Kafa' ? 'Head' : type}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {pStats.goalDetails?.map((g, idx) => (
            <span key={idx} onClick={() => removeGoal(p.id, idx)} className="bg-sunNavy text-white text-[8px] px-2 py-0.5 rounded cursor-pointer hover:bg-red-500 transition-colors animate-fadeIn uppercase">{g}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-sunNavy text-white p-6 shrink-0 flex justify-between">
          <h2 className="text-xl font-black italic uppercase tracking-tight">
            {step === 'attendance' ? 'Roll Call' : 'Enter Match Report'}
          </h2>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><i className="fas fa-times"></i></button>
        </div>

        {step === 'attendance' ? (
          <div className="flex-1 overflow-y-auto p-8 animate-fadeIn">
            <div className="mb-6 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
               <p className="text-sm font-bold text-blue-800">Check players who are on the pitch. Unchecked players won't gain appearance stats.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <h3 className="text-xs font-black text-sunNavy uppercase mb-2">TEAM A</h3>
                  {match.teamA.map(p => (
                    <div key={p.id} onClick={() => toggleAttendance(p.id)} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${presentPlayerIds.includes(p.id) ? 'border-sunNavy bg-sunNavy/5' : 'border-gray-100 bg-white opacity-50'}`}>
                       <div className="flex items-center gap-3">
                          <img src={p.photoUrl} className="w-8 h-8 rounded-full" />
                          <span className="font-bold text-sm">{p.name} {p.isDummy && '(G)'}</span>
                       </div>
                       <i className={`fas ${presentPlayerIds.includes(p.id) ? 'fa-check-circle text-sunNavy' : 'fa-circle text-gray-200'}`}></i>
                    </div>
                  ))}
               </div>
               <div className="space-y-3">
                  <h3 className="text-xs font-black text-sunYellow uppercase mb-2">TEAM B</h3>
                  {match.teamB.map(p => (
                    <div key={p.id} onClick={() => toggleAttendance(p.id)} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${presentPlayerIds.includes(p.id) ? 'border-sunYellow bg-sunYellow/5' : 'border-gray-100 bg-white opacity-50'}`}>
                       <div className="flex items-center gap-3">
                          <img src={p.photoUrl} className="w-8 h-8 rounded-full" />
                          <span className="font-bold text-sm">{p.name} {p.isDummy && '(G)'}</span>
                       </div>
                       <i className={`fas ${presentPlayerIds.includes(p.id) ? 'fa-check-circle text-sunYellow' : 'fa-circle text-gray-200'}`}></i>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-8 bg-gray-50 flex justify-center items-center gap-12 border-b animate-fadeIn">
               <div className="text-center">
                 <label className="text-[10px] font-black uppercase text-sunNavy tracking-widest mb-2 block">TEAM A</label>
                 <div className={`relative transition-all duration-300 ${pulseA ? 'animate-score-pulse' : ''}`}>
                   <input type="number" value={scoreA} onChange={e => setScoreA(parseInt(e.target.value) || 0)} className="block w-24 p-2 bg-white text-5xl font-black text-center rounded-2xl border-4 border-sunNavy shadow-inner outline-none focus:border-sunYellow" />
                 </div>
               </div>
               <div className="text-4xl font-black text-gray-300 italic pt-6">VS</div>
               <div className="text-center">
                 <label className="text-[10px] font-black uppercase text-sunYellow tracking-widest mb-2 block">TEAM B</label>
                 <div className={`relative transition-all duration-300 ${pulseB ? 'animate-score-pulse' : ''}`}>
                   <input type="number" value={scoreB} onChange={e => setScoreB(parseInt(e.target.value) || 0)} className="block w-24 p-2 bg-white text-5xl font-black text-center rounded-2xl border-4 border-sunYellow shadow-inner outline-none focus:border-sunNavy" />
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-100/30 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-xs font-black p-2 bg-sunNavy/5 rounded-lg uppercase text-sunNavy border-l-4 border-sunNavy">TEAM A PLAYERS</h3>
                {match.teamA.filter(p => presentPlayerIds.includes(p.id)).map(p => renderPlayerRow(p))}
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black p-2 bg-sunYellow/10 rounded-lg uppercase text-sunYellow border-l-4 border-sunYellow">TEAM B PLAYERS</h3>
                {match.teamB.filter(p => presentPlayerIds.includes(p.id)).map(p => renderPlayerRow(p))}
              </div>
            </div>
          </>
        )}
        
        <div className="p-6 bg-white border-t flex justify-between items-center shrink-0">
          {step === 'attendance' ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 italic">Total {presentPlayerIds.length} players present.</p>
              <button onClick={() => setStep('stats')} className="bg-sunNavy text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-sunNavy/90 transition-all uppercase tracking-widest italic">Proceed to Stats</button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('attendance')} className="text-gray-400 font-bold uppercase text-xs hover:text-sunNavy transition-colors"><i className="fas fa-arrow-left mr-2"></i> Back to Roll Call</button>
              <button onClick={() => onSave(match, scoreA, scoreB, Object.values(stats))} className="bg-sunNavy text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-sunNavy/90 hover:scale-[1.02] transition-all uppercase tracking-widest italic">SAVE MATCH</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchFinalizationModal;
