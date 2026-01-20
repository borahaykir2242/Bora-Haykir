
import { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Player } from '../types';

export const usePlayers = (currentUser: Player | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  // Filter States
  const [filterPosition, setFilterPosition] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTier, setFilterTier] = useState('All');
  const [sortOption, setSortOption] = useState('rating-desc');

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    const allPlayers = await dbService.getAllPlayers();
    setPlayers(allPlayers);
    setLoadingPlayers(false);
  };

  useEffect(() => {
    if (currentUser) fetchPlayers();
  }, [currentUser?.id]);

  const searchedPlayers = useMemo(() => {
    let filtered = [...players];

    // 1. Text Search (Name/Position)
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.position.toLowerCase().includes(query)
      );
    }

    // 2. Position Filter
    if (filterPosition !== 'All') {
      filtered = filtered.filter(p => p.position === filterPosition);
    }

    // 3. Status Filter (Availability)
    if (filterStatus === 'Available') {
      filtered = filtered.filter(p => !p.activeInjury);
    } else if (filterStatus === 'Injured') {
      filtered = filtered.filter(p => !!p.activeInjury);
    }

    // 4. Skill Tier Filter
    if (filterTier === 'Elite') {
      filtered = filtered.filter(p => p.rating >= 85);
    } else if (filterTier === 'Pro') {
      filtered = filtered.filter(p => p.rating >= 75 && p.rating < 85);
    } else if (filterTier === 'Rookie') {
      filtered = filtered.filter(p => p.rating < 75);
    }

    // 5. Sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'rating-desc': return b.rating - a.rating;
        case 'rating-asc': return a.rating - b.rating;
        case 'market-desc': return b.marketValue - a.marketValue;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    return filtered;
  }, [players, searchQuery, filterPosition, filterStatus, filterTier, sortOption]);

  return { 
    players, 
    searchedPlayers, 
    searchQuery, 
    setSearchQuery, 
    loadingPlayers, 
    setPlayers, 
    fetchPlayers,
    filterPosition,
    setFilterPosition,
    filterStatus,
    setFilterStatus,
    filterTier,
    setFilterTier,
    sortOption,
    setSortOption
  };
};
