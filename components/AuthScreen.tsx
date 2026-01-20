
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "https://esm.sh/firebase@10.8.0/auth";
import { Player } from '../types';
import { calculateDynamicMarketValue } from '../services/marketService';
import { dbService } from '../services/dbService';

interface AuthScreenProps {
  onAuthSuccess: (player: Player) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Player['position']>('Orta Saha');
  const [preferredFoot, setPreferredFoot] = useState<'Sağ' | 'Sol' | 'Her İkisi'>('Sağ');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Added React.FormEvent type for event handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await dbService.getPlayer(userCredential.user.uid);
      if (profile) {
        onAuthSuccess(profile);
      } else {
        setError('Profile not found.');
      }
    } catch (err: any) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Added React.FormEvent type for event handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const newPlayer: Player = {
        id: uid,
        name: name || 'Anonymous Player',
        email,
        position,
        preferredFoot,
        nationality: 'Türkiye',
        role: 'player',
        photoUrl: `https://avatar.iran.liara.run/public/${Math.floor(Math.random() * 100)}`,
        rating: 50,
        marketValue: 25000,
        attributes: { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 },
        matchesPlayed: 0,
        matchesOrganized: 0,
        goals: 0,
        assists: 0,
        consecutiveMatches: 0
      };
      
      newPlayer.marketValue = calculateDynamicMarketValue(newPlayer);
      await dbService.savePlayer(newPlayer);
      onAuthSuccess(newPlayer);
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? 'Email already in use.' : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen soccer-bg flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 animate-fadeIn">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-sunYellow text-sunNavy rounded-3xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
              <i className="fas fa-plane-departure"></i>
           </div>
           <h1 className="text-3xl font-black text-sunNavy uppercase italic">SunExpress <span className="text-sunYellow">Pro</span></h1>
           <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">Official Squad Management</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
           <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${mode === 'login' ? 'bg-white text-sunNavy shadow-sm' : 'text-gray-400'}`}>SIGN IN</button>
           <button onClick={() => setMode('register')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${mode === 'register' ? 'bg-white text-sunNavy shadow-sm' : 'text-gray-400'}`}>REGISTER</button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl border border-red-100 text-center">{error}</div>}

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Full Name</label>
              <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy"/>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Email</label>
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy"/>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Password</label>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy"/>
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Position</label>
                <select value={position} onChange={e=>setPosition(e.target.value as any)} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy">
                  <option value="Kaleci">GK</option><option value="Defans">DEF</option><option value="Orta Saha">MID</option><option value="Forvet">FWD</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Foot</label>
                <select value={preferredFoot} onChange={e=>setPreferredFoot(e.target.value as any)} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-sunYellow rounded-2xl outline-none font-bold text-sunNavy">
                  <option value="Sağ">Right</option><option value="Sol">Left</option><option value="Her İkisi">Both</option>
                </select>
              </div>
            </div>
          )}

          <button disabled={loading} type="submit" className="w-full bg-sunNavy text-white py-5 rounded-[2rem] font-black mt-4 shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest italic disabled:opacity-50">
            {loading ? 'AUTHENTICATING...' : (mode === 'login' ? 'LOGIN' : 'JOIN THE SQUAD')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
