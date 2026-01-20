
import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { calculateDynamicMarketValue } from '../services/marketService';

interface PlayerModalProps {
  player?: Player;
  onClose: () => void;
  onSave: (player: Player) => void;
}

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

const PlayerModal: React.FC<PlayerModalProps> = ({ player, onClose, onSave }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const defaultAttributes = {
    pace: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defending: 50,
    physical: 50
  };

  const [formData, setFormData] = useState<Partial<Player>>({
    name: '',
    photoUrl: 'https://picsum.photos/id/1/150/150',
    position: 'Orta Saha',
    birthDate: '1995-01-01',
    age: 29,
    height: 175,
    weight: 75,
    preferredFoot: 'Sağ',
    nationality: 'Türkiye',
    attributes: defaultAttributes,
    rating: 50,
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    marketValue: 0,
    role: 'player'
  });

  useEffect(() => {
    if (player) {
      setFormData({
        ...player,
        attributes: player.attributes || defaultAttributes
      });
    }
  }, [player]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttrChange = (key: keyof Player['attributes'], val: number) => {
    const currentAttrs = formData.attributes || defaultAttributes;
    const newAttrs = { ...currentAttrs, [key]: val };
    const sum = Object.values(newAttrs).reduce((acc, curr) => (acc as number) + (curr as number), 0) as number;
    const newRating = Math.round(sum / 6);
    
    setFormData(prev => {
      const updated = { ...prev, attributes: newAttrs, rating: newRating };
      return { 
        ...updated, 
        marketValue: calculateDynamicMarketValue(updated as Player) 
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    onSave({
      ...(formData as Player),
      id: player?.id || Math.random().toString(36).substr(2, 9),
      attributes: formData.attributes || defaultAttributes,
      rating: formData.rating || 50,
      marketValue: calculateDynamicMarketValue(formData as Player)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fadeIn">
        <form onSubmit={handleSubmit}>
          <div className="bg-sunNavy p-6 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold uppercase italic">{player ? 'Edit Player' : 'Add New Player'}</h2>
            <button type="button" onClick={onClose} className="hover:rotate-90 transition-transform">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="flex justify-center mb-6">
               <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border-4 border-gray-100 shadow-lg relative">
                    <img src={formData.photoUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fas fa-camera text-white text-xl"></i>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-2">Full Name</label>
                <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl px-4 py-2 outline-none font-bold text-sunNavy" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-2">Position</label>
                <select value={formData.position || 'Orta Saha'} onChange={e => {
                    const newPos = e.target.value as Player['position'];
                    setFormData(prev => ({
                        ...prev, 
                        position: newPos,
                        marketValue: calculateDynamicMarketValue({ ...prev, position: newPos } as Player)
                    }));
                }} className="w-full bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl px-4 py-2 outline-none font-bold text-sunNavy">
                  <option value="Kaleci">Goalkeeper</option>
                  <option value="Defans">Defender</option>
                  <option value="Orta Saha">Midfielder</option>
                  <option value="Forvet">Forward</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-2">Nationality</label>
                <select value={formData.nationality || 'Türkiye'} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl px-4 py-2 outline-none font-bold text-sunNavy">
                  {COUNTRIES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-2">Preferred Foot</label>
                <select value={formData.preferredFoot || 'Sağ'} onChange={e => setFormData({...formData, preferredFoot: e.target.value as any})} className="w-full bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-xl px-4 py-2 outline-none font-bold text-sunNavy">
                  <option value="Sağ">Right</option><option value="Sol">Left</option><option value="Her İkisi">Both</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 text-center">Ability Attributes (OVR: {formData.rating || 50})</label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.attributes || defaultAttributes).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                      <span>{key}</span><span>{value}</span>
                    </div>
                    <input type="range" min="1" max="99" value={value} onChange={e => handleAttrChange(key as any, parseInt(e.target.value))} className="w-full accent-sunYellow" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-gray-400 uppercase text-xs">Cancel</button>
            <button type="submit" className="flex-[2] bg-sunYellow text-sunNavy py-3 rounded-xl font-black shadow-lg uppercase text-xs">Save Player</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerModal;
