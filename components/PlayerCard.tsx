
import React, { useMemo } from 'react';
import { Player } from '../types';
import { getPlayerBadges } from '../services/badgeService';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  onEdit?: (player: Player) => void;
  selected?: boolean;
  showStats?: boolean;
}

const formatCurrency = (val: number) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  return `$${(val / 1000).toFixed(0)}K`;
};

const getCountryFlag = (nationality: string) => {
  const flags: Record<string, string> = {
    'Türkiye': '🇹🇷',
    'Germany': '🇩🇪',
    'United Kingdom': '🇬🇧',
    'France': '🇫🇷',
    'Spain': '🇪🇸',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'Netherlands': '🇳🇱',
    'Portugal': '🇵🇹',
    'Italy': '🇮🇹',
    'USA': '🇺🇸'
  };
  return flags[nationality] || '🏳️';
};

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, onEdit, selected, showStats = true }) => {
  const badges = player.isDummy ? [] : getPlayerBadges(player);
  
  /**
   * Dynamically calculates age from YYYY-MM-DD birthDate string.
   * This ensures the age is always accurate relative to the current date.
   */
  const calculatedAge = useMemo(() => {
    if (!player.birthDate) return null;
    const birth = new Date(player.birthDate);
    if (isNaN(birth.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, [player.birthDate]);

  const attributeConfig: { key: keyof Player['attributes']; label: string; icon: string; color: string; borderColor: string }[] = [
    { key: 'pace', label: 'PAC', icon: 'fa-bolt', color: 'bg-sunYellow', borderColor: 'hover:border-sunYellow' },
    { key: 'shooting', label: 'SHO', icon: 'fa-crosshairs', color: 'bg-red-500', borderColor: 'hover:border-red-500' },
    { key: 'passing', label: 'PAS', icon: 'fa-share', color: 'bg-blue-400', borderColor: 'hover:border-blue-400' },
    { key: 'dribbling', label: 'DRI', icon: 'fa-wand-magic-sparkles', color: 'bg-purple-400', borderColor: 'hover:border-purple-400' },
    { key: 'defending', label: 'DEF', icon: 'fa-shield-halved', color: 'bg-sunNavy', borderColor: 'hover:border-sunNavy' },
    { key: 'physical', label: 'PHY', icon: 'fa-dumbbell', color: 'bg-orange-600', borderColor: 'hover:border-orange-600' },
  ];

  const dominantAttr = useMemo(() => {
    if (!player.attributes) return attributeConfig[0];
    return attributeConfig.reduce((prev, current) => 
      (player.attributes[current.key] > player.attributes[prev.key]) ? current : prev
    );
  }, [player.attributes]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(player);
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[2rem] shadow-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer border-2 relative group 
        ${selected ? 'border-sunYellow ring-4 ring-sunYellow/10' : 'border-gray-100'} 
        ${player.isDummy ? 'border-dashed border-gray-300 opacity-80' : player.activeInjury ? 'border-red-400 bg-red-50/20' : dominantAttr.borderColor}`}
    >
      {player.activeInjury && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500 z-50 animate-pulse"></div>
      )}

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-30">
        {onEdit && !player.isDummy && (
          <button 
            onClick={handleEditClick}
            className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:text-sunNavy hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
          >
            <i className="fas fa-edit text-xs"></i>
          </button>
        )}
        {player.isDummy && (
          <div className="bg-gray-400 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase shadow-sm">
            GUEST
          </div>
        )}
      </div>

      <div className={`flex items-center p-5 relative`}>
        <div className={`absolute top-0 right-0 p-4 flex flex-col items-end gap-1`}>
           <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-110 ${player.isDummy ? 'bg-gray-400' : player.rating >= 85 ? 'bg-sunYellow text-sunNavy' : 'bg-sunNavy'}`}>
             {player.rating}
           </div>
           {!player.isDummy && (
             <div className="bg-sunYellow/20 text-sunNavy px-2 py-0.5 rounded text-[8px] font-black uppercase border border-sunYellow/30 group-hover:bg-sunYellow group-hover:text-sunNavy transition-colors">
               {formatCurrency(player.marketValue)}
             </div>
           )}
        </div>

        <div className="relative">
          <img 
            src={player.photoUrl} 
            alt={player.name} 
            className={`w-24 h-24 rounded-[1.5rem] object-cover border-2 border-gray-50 shadow-inner transition-transform group-hover:scale-105 ${player.activeInjury ? 'grayscale opacity-70' : ''}`}
          />
          {/* Position Badge moved to Top-Left of photo frame */}
          <div className={`absolute -top-2 -left-2 ${player.isDummy ? 'bg-gray-500' : 'bg-sunNavy'} text-white px-2.5 py-1 rounded-xl border-2 border-white shadow-sm text-[9px] font-black uppercase tracking-tighter flex flex-col items-center leading-none z-10`}>
            <span>{player.position === 'Kaleci' ? 'GK' : player.position === 'Defans' ? 'DEF' : player.position === 'Orta Saha' ? 'MID' : 'FWD'}</span>
          </div>
          
          {/* Subtle Physical Info Badges */}
          {!player.isDummy && (
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex flex-wrap gap-1">
                {player.height && (
                  <span className="bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[7px] font-bold">{player.height}cm</span>
                )}
                {player.weight && (
                  <span className="bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[7px] font-bold">{player.weight}kg</span>
                )}
                {player.preferredFoot && (
                  <span className="bg-sunNavy/5 text-sunNavy px-1 py-0.5 rounded text-[7px] font-black">{player.preferredFoot === 'Sağ' ? 'RIGHT' : player.preferredFoot === 'Sol' ? 'LEFT' : 'BOTH'}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ml-6 flex-1 min-w-0 pr-8">
          <h3 className="font-bold text-gray-800 text-lg leading-tight truncate group-hover:text-sunNavy transition-colors uppercase flex items-center gap-2">
            {player.name} 
            {!player.isDummy && <span className="text-base flex-shrink-0">{getCountryFlag(player.nationality || '')}</span>}
          </h3>
          
          <div className="flex flex-col gap-1 mt-1">
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-lg truncate">
                  {player.isDummy ? 'GUEST' : player.nationality}
               </span>
               {calculatedAge && (
                 <span className="text-[10px] font-black text-sunNavy/40 uppercase flex-shrink-0">
                   • {calculatedAge}
                 </span>
               )}
             </div>
             
             {player.activeInjury && (
               <div className="mt-1 flex flex-col bg-red-100 text-red-700 px-3 py-1.5 rounded-xl border border-red-200 animate-fadeIn">
                 <div className="flex items-center gap-1.5">
                   <i className="fas fa-exclamation-triangle text-[8px]"></i>
                   <span className="text-[9px] font-black uppercase leading-none">{player.activeInjury.detail}</span>
                 </div>
                 <div className="flex items-center justify-between mt-1">
                   <span className="text-[8px] font-bold opacity-75">RECOVERY:</span>
                   <span className="text-[9px] font-black">{player.activeInjury.weeksRemaining} {player.activeInjury.weeksRemaining === 1 ? 'WEEK' : 'WEEKS'}</span>
                 </div>
               </div>
             )}
          </div>

          {!player.activeInjury && !player.isDummy && (
            <div className="mt-3 flex items-center gap-4">
              <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">APP</span>
                  <span className="text-sm font-bold text-gray-700">{player.matchesPlayed}</span>
              </div>
              <div className="w-px h-6 bg-gray-100"></div>
              <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">GOAL</span>
                  <span className="text-sm font-bold text-sunNavy">{player.goals}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showStats && player.attributes && (
        <div className={`px-5 pb-5 pt-3 border-t border-gray-100 transition-colors ${player.activeInjury ? 'bg-gray-50/30 grayscale-[0.5]' : 'bg-gray-50/50 group-hover:bg-white'}`}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {attributeConfig.map((attr) => (
              <div key={attr.key} className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <i className={`fas ${attr.icon} w-3 text-center transition-colors ${player.attributes[attr.key] >= 80 ? 'text-sunNavy' : ''}`}></i>
                    {attr.label}
                  </span>
                  <span>{player.attributes[attr.key]}</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full ${attr.color || 'bg-sunNavy'} transition-all duration-700 ease-out group-hover:brightness-110`} 
                    style={{ width: `${player.attributes[attr.key]}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
