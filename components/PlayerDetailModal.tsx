
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Player, Match } from '../types';
import { getPlayerBadges } from '../services/badgeService';

interface PlayerDetailModalProps {
  player: Player;
  currentUser: Player;
  matches: Match[];
  onClose: () => void;
}

const formatCurrency = (val: number) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  return `$${(val / 1000).toFixed(0)}K`;
};

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, currentUser, matches, onClose }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);
  const badges = getPlayerBadges(player);
  const [showContact, setShowContact] = useState(false);

  /**
   * Dynamically calculates age from YYYY-MM-DD birthDate string.
   * Accuracy is maintained by checking if the birthday has passed in the current year.
   */
  const calculatedAge = useMemo(() => {
    if (!player.birthDate) return '—';
    const birthDate = new Date(player.birthDate);
    if (isNaN(birthDate.getTime())) return '—';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If current month is before birth month, or same month but before birth day, subtract one year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [player.birthDate]);

  const playerMatches = matches.filter(m => 
    m.teamA.some(p => p.id === player.id) || m.teamB.some(p => p.id === player.id)
  ).reverse();

  useEffect(() => {
    if (chartRef.current && playerMatches.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        const labels = playerMatches.map(m => m.date);
        const goalsData = playerMatches.map(m => m.playerStats?.find(s => s.playerId === player.id)?.goals || 0);
        const assistsData = playerMatches.map(m => m.playerStats?.find(s => s.playerId === player.id)?.assists || 0);

        // @ts-ignore
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Goals',
                data: goalsData,
                borderColor: '#FFC72C',
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: '#FFC72C'
              },
              {
                label: 'Assists',
                data: assistsData,
                borderColor: '#003580',
                backgroundColor: 'rgba(0, 53, 128, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: '#003580'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  usePointStyle: true,
                  boxWidth: 6,
                  font: { weight: 'bold', size: 10 }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1, font: { size: 10 } },
                grid: { display: false }
              },
              x: {
                ticks: { font: { size: 10 } },
                grid: { display: false }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [player.id, playerMatches]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        <div className="relative h-48 bg-sunNavy shrink-0">
          <div className="absolute inset-0 soccer-bg opacity-30"></div>
          <button onClick={onClose} className="absolute top-6 right-6 z-20 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-all">
            <i className="fas fa-times"></i>
          </button>
          <div className="absolute -bottom-12 left-8 flex items-end space-x-6 z-10">
            <img src={player.photoUrl} className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl" alt="" />
            <div className="pb-4">
              <h2 className="text-3xl font-black text-white drop-shadow-md italic uppercase">{player.name}</h2>
              <div className="flex gap-2">
                <span className="bg-sunYellow text-sunNavy px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {player.position}
                </span>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black">
                  {formatCurrency(player.marketValue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-16 px-8 pb-8 space-y-6">
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Physical Profile</h3>
             <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                   <p className="text-[8px] font-bold text-gray-400 uppercase">AGE</p>
                   <p className="text-sm font-black text-sunNavy">{calculatedAge}</p>
                </div>
                <div className="text-center">
                   <p className="text-[8px] font-bold text-gray-400 uppercase">HEIGHT</p>
                   <p className="text-sm font-black text-sunNavy">{player.height ? `${player.height} cm` : '—'}</p>
                </div>
                <div className="text-center">
                   <p className="text-[8px] font-bold text-gray-400 uppercase">WEIGHT</p>
                   <p className="text-sm font-black text-sunNavy">{player.weight ? `${player.weight} kg` : '—'}</p>
                </div>
                <div className="text-center">
                   <p className="text-[8px] font-bold text-gray-400 uppercase">NATIONALITY</p>
                   <p className="text-xs font-black text-sunNavy truncate">{player.nationality || '—'}</p>
                </div>
             </div>
          </div>

          {(currentUser.role === 'admin' || currentUser.id === player.id) && (
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Contact Information</h3>
                 <button 
                  onClick={() => setShowContact(!showContact)} 
                  className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-200"
                 >
                   {showContact ? 'HIDE' : 'SHOW'}
                 </button>
               </div>
               {showContact ? (
                 <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                   <div>
                     <p className="text-[8px] font-bold text-gray-400 uppercase">Email</p>
                     <p className="text-sm font-black text-sunNavy">{player.email || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-[8px] font-bold text-gray-400 uppercase">Phone</p>
                     <p className="text-sm font-black text-sunNavy">{player.phone || 'N/A'}</p>
                   </div>
                 </div>
               ) : (
                 <p className="text-xs text-blue-400 font-bold italic">Click show to view details.</p>
               )}
            </div>
          )}

          {badges.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Achievements & Badges</h3>
               <div className="flex flex-wrap gap-4">
                 {badges.map(badge => (
                   <div key={badge.id} className="flex items-center gap-2 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-gray-100 group transition-all hover:scale-105">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${badge.color} bg-gray-50`}>
                       <i className={`fas ${badge.icon}`}></i>
                     </div>
                     <div>
                       <p className="text-xs font-black text-gray-800">{badge.name}</p>
                       <p className="text-[8px] text-gray-400 font-bold uppercase">{badge.description}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">App</span>
              <span className="text-2xl font-black text-gray-800">{player.matchesPlayed}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Goal</span>
              <span className="text-2xl font-black text-sunYellow">{player.goals}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ast</span>
              <span className="text-2xl font-black text-blue-600">{player.assists}</span>
            </div>
            <div className="bg-sunNavy p-4 rounded-2xl text-center text-white">
              <span className="block text-[10px] font-bold opacity-70 uppercase tracking-widest">OVR</span>
              <span className="text-2xl font-black">{player.rating}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Form Graph</h3>
            <div className="h-48 w-full">
              {playerMatches.length > 0 ? (
                <canvas ref={chartRef}></canvas>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">
                  Not enough match data for graph
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Attribute Analysis</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {Object.entries(player.attributes).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500 uppercase">{key}</span>
                    <span className="text-sunNavy font-black">{value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sunYellow" style={{ width: `${value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDetailModal;
