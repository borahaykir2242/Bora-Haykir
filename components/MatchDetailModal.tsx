
import React, { useEffect, useState } from 'react';
import { Match, Player } from '../types';

interface MatchDetailModalProps {
  match: Match;
  onClose: () => void;
  onPlayerClick: (player: Player) => void;
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose, onPlayerClick }) => {
  const [animatedScoreA, setAnimatedScoreA] = useState(0);
  const [animatedScoreB, setAnimatedScoreB] = useState(0);

  useEffect(() => {
    if (!match) return;
    const duration = 800;
    const steps = 20;
    const interval = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setAnimatedScoreA(Math.floor((match.scoreA || 0) * progress));
      setAnimatedScoreB(Math.floor((match.scoreB || 0) * progress));
      
      if (currentStep >= steps) {
        setAnimatedScoreA(match.scoreA || 0);
        setAnimatedScoreB(match.scoreB || 0);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [match?.scoreA, match?.scoreB]);

  const renderTeamStats = (team: Player[] = [], title: string, colorClass: string) => {
    const list = Array.isArray(team) ? team : [];
    return (
      <div className="space-y-4">
        <h3 className={`text-xl font-black ${colorClass} italic uppercase tracking-wider border-b-2 pb-2`}>
          {title}
        </h3>
        <div className="space-y-3">
          {list.length > 0 ? list.map(player => {
            if (!player) return null;
            const stats = (match?.playerStats || []).find(s => s.playerId === player.id);
            return (
              <div 
                key={player.id} 
                onClick={() => onPlayerClick(player)}
                className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <img src={player.photoUrl} className="w-10 h-10 rounded-full object-cover border" alt="" />
                  <div>
                    <p className="font-bold text-gray-800 text-sm group-hover:text-green-600 transition-colors">{player.name || 'Anonymous'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{player.position}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <span className="block text-[8px] font-bold text-gray-400 uppercase">Gol</span>
                    <span className="font-black text-green-600">{stats?.goals || 0}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[8px] font-bold text-gray-400 uppercase">Asist</span>
                    <span className="font-black text-blue-600">{stats?.assists || 0}</span>
                  </div>
                  <div className="text-center bg-gray-50 px-2 py-1 rounded-lg">
                    <span className="block text-[8px] font-bold text-gray-400 uppercase">Puan</span>
                    <span className="font-black text-gray-800">{stats?.matchRating || '-'}</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <p className="text-gray-400 text-xs italic">Kadro henüz kurulmamış.</p>
          )}
        </div>
      </div>
    );
  };

  if (!match) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[120] p-4">
      <style>{`
        @keyframes scorePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-score {
          animation: scorePulse 0.5s ease-out forwards;
        }
      `}</style>
      <div className="bg-gray-50 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-900 text-white p-8 relative shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-red-600/10 pointer-events-none"></div>
          <button onClick={onClose} className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all z-10">
            <i className="fas fa-times"></i>
          </button>
          <div className="text-center space-y-2 relative z-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">{match.date} • {match.location}</p>
            <div className="flex items-center justify-center space-x-12">
              <div className="text-right flex-1 hidden sm:block">
                <h2 className="text-2xl font-black text-blue-400 italic">TAKIM A</h2>
                <p className="text-xs opacity-60">Ev Sahibi</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex flex-col items-center">
                   <span className={`text-6xl font-black drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] ${animatedScoreA === match.scoreA ? 'animate-score' : ''}`}>
                    {animatedScoreA}
                  </span>
                  <span className="text-[10px] font-black text-blue-400 sm:hidden">TAKIM A</span>
                </div>
                <span className="text-2xl font-bold opacity-30 italic">VS</span>
                <div className="flex flex-col items-center">
                  <span className={`text-6xl font-black drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] ${animatedScoreB === match.scoreB ? 'animate-score' : ''}`}>
                    {animatedScoreB}
                  </span>
                  <span className="text-[10px] font-black text-red-400 sm:hidden">TAKIM B</span>
                </div>
              </div>
              <div className="text-left flex-1 hidden sm:block">
                <h2 className="text-2xl font-black text-red-400 italic">TAKIM B</h2>
                <p className="text-xs opacity-60">Deplasman</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {renderTeamStats(match.teamA || [], "Takım A Kadrosu", "text-blue-600")}
            {renderTeamStats(match.teamB || [], "Takım B Kadrosu", "text-red-600")}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 font-medium italic">Oyuncu detaylarını görmek için isimlere tıklayabilirsiniz.</p>
        </div>
      </div>
    </div>
  );
};

export default MatchDetailModal;
