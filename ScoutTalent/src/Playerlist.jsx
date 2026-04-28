import React, { useEffect, useRef, useState } from 'react';
import logo from '/logo.png';
import { Home, User, Mail, Plus, Trash2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  getPlayerStorageKey,
  mergePlayerAnalysis,
  savePlayerAnalysis,
  uploadPlayerVideoForAnalysis,
} from './scoutingApi';

const defaultPlayers = [
  { username: "Rafael Leao", teamname: "AC Milan", position: "Left Winger", country: "Portugal", jersey: "17", image: "https://res.cloudinary.com/demo/image/upload/v1693561200/leao_acmilan.jpg", age: "24", height: "6'2", weight: "81kg", foot: "Right", marketed: false },
  { username: "Federico Valverde", teamname: "Real Madrid", position: "Midfielder", country: "Uruguay", jersey: "15", image: "https://res.cloudinary.com/demo/image/upload/v1693561200/valverde_real.jpg", age: "25", height: "6'0", weight: "78kg", foot: "Right", marketed: false },
  { username: "Rodri", teamname: "Manchester City", position: "Defensive Midfielder", country: "Spain", jersey: "16", image: "https://res.cloudinary.com/demo/image/upload/v1693561200/rodri_mc.jpg", age: "27", height: "6'3", weight: "82kg", foot: "Right", marketed: false },
  { username: "Phil Foden", teamname: "Manchester City", position: "Midfielder", country: "England", jersey: "47", image: "https://res.cloudinary.com/demo/image/upload/v1693561200/foden_mc.jpg", age: "23", height: "5'7", weight: "70kg", foot: "Left", marketed: false },
  { username: "Joao Felix", teamname: "Atletico Madrid", position: "Forward", country: "Portugal", jersey: "7", image: "https://res.cloudinary.com/demo/image/upload/v1693561200/felix_atletico.jpg", age: "24", height: "5'11", weight: "70kg", foot: "Right", marketed: false }
];

export default function PlayerList() {
  const [players, setPlayers] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('myPlayers') || '[]');
      return stored.length > 0 ? stored : defaultPlayers;
    } catch (e) {
      console.error('Failed to parse myPlayers from localStorage', e);
      return defaultPlayers;
    }
  });

  const [marketPlayers, setMarketPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadingPlayerKey, setUploadingPlayerKey] = useState('');
  const [newPlayer, setNewPlayer] = useState({
    username: '', teamname: '', position: '', country: '', jersey: '', image: '', age: '', height: '', heightFeet: '', heightInches: '', weight: '', foot: ''
  });
  const selectedPlayerRef = useRef(null);
  const fileInputRef = useRef(null);

  // persist players to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('myPlayers', JSON.stringify(players));
    } catch (e) {
      console.error('Failed to save players to localStorage', e);
    }
  }, [players]);

  // fetch market players
  useEffect(() => {
    const loadMarket = async () => {
      try {
        const res = await axios.get('http://localhost:5501/market/players');
        const mPlayers = res.data || [];
        setMarketPlayers(mPlayers);

        setPlayers(prev =>
          prev.map(p => {
            const match = mPlayers.find(mp =>
              mp._id === p._id ||
              mp.common_name === p.username ||
              mp.display_name === p.username ||
              mp.username === p.username
            );
            if (match) {
              return { ...p, marketed: true, _id: match._id };
            }
            return { ...p, marketed: p.marketed || false };
          })
        );
      } catch (err) {
        console.error('Failed to load market players', err);
        setMessage('Failed to load market data.');
        setTimeout(() => setMessage(''), 3000);
      }
    };
    loadMarket();
  }, []);

  const findServerId = (player) => {
    if (player._id) return player._id;
    const match = marketPlayers.find(mp =>
      mp.common_name === player.username ||
      mp.display_name === player.username ||
      mp.username === player.username
    );
    return match?._id;
  };

  // Add player to market
  const addToMarket = async (player) => {
    setIsLoading(true);
    setMessage('');
    const currentAgentUsername = localStorage.getItem('chatUsername') || '';
    const currentAgentEmail = localStorage.getItem('agentEmail') || '';
    const currentAgentPhone = localStorage.getItem('agentPhone') || '';

    if (!currentAgentUsername) {
      setMessage('Please log in again as an agent before adding players to market.');
      setTimeout(() => setMessage(''), 3000);
      setIsLoading(false);
      return;
    }

    try {
      const agentPayload = {
        username: currentAgentUsername,
        name: currentAgentUsername,
        email: currentAgentEmail,
        phone: currentAgentPhone,
      };
      const payload = {
        username: player.username,
        teamname: player.teamname,
        position: player.position,
        country: player.country,
        jersey: player.jersey,
        image: player.image,
        age: player.age,
        height: player.height,
        weight: player.weight,
        foot: player.foot,
        agentUsername: currentAgentUsername,
        agentName: currentAgentUsername,
        agentEmail: currentAgentEmail,
        agentPhone: currentAgentPhone,
        managedByUsername: currentAgentUsername,
        agent: agentPayload,
      };
      const res = await axios.post('http://localhost:5501/market/players', payload);
      const added = res.data;
      const wasAlreadyInMarket = marketPlayers.some(mp => 
        mp._id === added._id || 
        mp.common_name === added.common_name || 
        mp.display_name === added.display_name || 
        mp.username === added.username ||
        mp.common_name === player.username ||
        mp.display_name === player.username ||
        mp.username === player.username
      );

      // Update player in the list to show as marketed
      setPlayers(prev => prev.map(p =>
        p.username === player.username ? { ...p, marketed: true, _id: added._id || p._id } : p
      ));

      // Update cached market players with latest agent/player info
      setMarketPlayers(prev => {
        const exists = prev.some(mp => 
          mp._id === added._id || 
          mp.common_name === added.common_name || 
          mp.display_name === added.display_name ||
          mp.username === added.username ||
          mp.common_name === player.username ||
          mp.display_name === player.username ||
          mp.username === player.username
        );
        if (exists) {
          return prev.map(mp => (
            mp._id === added._id ||
            mp.common_name === added.common_name ||
            mp.display_name === added.display_name ||
            mp.username === added.username ||
            mp.common_name === player.username ||
            mp.display_name === player.username ||
            mp.username === player.username
          ) ? added : mp);
        }
        return [...prev, added];
      });

      setMessage(
        wasAlreadyInMarket
          ? `${player.username} market record updated with current agent details.`
          : `${player.username} added to market successfully!`
      );
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('addToMarket error', err);
      setMessage(`Failed to add ${player.username} to market.`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove player from market only, keep in player list
  const removeFromMarket = async (player) => {
    setIsLoading(true);
    setMessage('');
    try {
      const id = findServerId(player);
      if (!id) {
        setMessage('Cannot remove: server ID not found for this player.');
        setTimeout(() => setMessage(''), 3000);
        setIsLoading(false);
        return;
      }

      // Remove from Market DB only
      await axios.delete(`http://localhost:5501/market/players/${id}`);

      // Update local state - remove from market players
      setMarketPlayers(prev => prev.filter(mp => mp._id !== id));
      
      // Update player's marketed status to false instead of removing from players list
      setPlayers(prev => prev.map(p => 
        (p.username === player.username || (p._id && p._id === id)) 
          ? { ...p, marketed: false } 
          : p
      ));

      setMessage(`${player.username} removed from market but kept in your team!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('removeFromMarket error', err);
      setMessage(`Failed to remove ${player.username} from market.`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new player
  const handleAddNewPlayer = async () => {
    if (!newPlayer.username || !newPlayer.teamname) {
      setMessage('Username and Team name are required!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setIsLoading(true);
    try {
      // Build height string from feet/inches if provided
      const feet = newPlayer.heightFeet || 0;
      const inches = newPlayer.heightInches || 0;
      const heightStr = `${feet}'${inches}`;
      // Persist to Offplayers
      // await axios.post('http://localhost:5501/Offplayers', {
      //   playerName: newPlayer.username,
      //   teamName: newPlayer.teamname,
      //   position: newPlayer.position,
      //   country: newPlayer.country,
      //   jerseyNumber: newPlayer.jersey,
      //   age: newPlayer.age,
      //   height: heightStr,
      //   weight: newPlayer.weight,
      //   preferredFoot: newPlayer.foot,
      //   profileImageUrl: newPlayer.image
      // });

      // append locally
      setPlayers(prev => [...prev, { ...newPlayer, height: heightStr, marketed: false }]);

      setNewPlayer({ username: '', teamname: '', position: '', country: '', jersey: '', image: '', age: '', height: '', heightFeet: '', heightInches: '', weight: '', foot: '' });
      setShowAddForm(false);
      setMessage('New player added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('handleAddNewPlayer error', err);
      setMessage(err.response?.data?.message || 'Failed to add player.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAddPlayer = () => {
    setShowAddForm(false);
    setNewPlayer({ username: '', teamname: '', position: '', country: '', jersey: '', image: '', age: '', height: '', heightFeet: '', heightInches: '', weight: '', foot: '' });
  };

  const deleteFromTeam = (player) => {
    setPlayers(prev => {
      const next = prev.filter(p => {
        if (player._id && p._id) return p._id !== player._id;
        return p.username !== player.username;
      });
      try { localStorage.setItem('myPlayers', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const getPlayerKey = (player) => getPlayerStorageKey(player);

  const handleSelectVideo = (player) => {
    selectedPlayerRef.current = player;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    const player = selectedPlayerRef.current;

    if (!file || !player) return;

    const playerKey = getPlayerKey(player);
    setUploadingPlayerKey(playerKey);
    setMessage('');

    try {
      if (!file.type.startsWith('video/')) {
        throw new Error('Please choose a valid video file.');
      }

      const analysis = await uploadPlayerVideoForAnalysis(player, file);
      const updatedPlayer = mergePlayerAnalysis(player, analysis);
      savePlayerAnalysis(playerKey, analysis);

      setPlayers(prev => prev.map(existing => {
        const matches = existing._id
          ? existing._id === player._id
          : existing.username === player.username;
        return matches ? { ...existing, ...updatedPlayer } : existing;
      }));

      setMarketPlayers(prev => {
        const exists = prev.some(existing => existing._id === updatedPlayer._id);
        if (exists) {
          return prev.map(existing => existing._id === updatedPlayer._id ? updatedPlayer : existing);
        }
        return [...prev, updatedPlayer];
      });

      setMessage(`${player.username} video analyzed and stats saved.`);
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      console.error('Video upload analysis failed', error);
      setMessage(error.message || 'Failed to analyze video.');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setUploadingPlayerKey('');
      selectedPlayerRef.current = null;
      event.target.value = '';
    }
  };

  const localMarket = players.filter(p => p.marketed);
  const serverOnlyMarket = marketPlayers.filter(mp =>
    !players.some(p =>
      (p._id && p._id === mp._id) ||
      p.username === mp.common_name ||
      p.username === mp.display_name ||
      p.username === mp.username
    )
  ).map(mp => ({
    username: mp.common_name || mp.display_name || mp.username || `player-${mp._id}`,
    teamname: mp.team_name || mp.teamname || '',
    position: mp.position || '',
    country: mp.country_name || mp.country || '',
    jersey: mp.shirt_number || mp.jersey || '',
    image: mp.image_path || mp.image || '',
    age: mp.current_age || mp.age || '',
    height: mp.height_cm || mp.height || '',
    weight: mp.weight_kg || mp.weight || '',
    foot: mp.preferred_foot || mp.foot || '',
    _id: mp._id,
    marketed: true
  }));

  const marketToShow = [...localMarket, ...serverOnlyMarket];

  return (
    <div>
    <div className="flex min-h-screen bg-white font-[Buenard]">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
      <aside className="bg-[#0f2343] text-white w-64 py-10 px-6 flex flex-col justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-10">
            <img src={logo} alt="Logo" className="h-10 rounded-full" />
            <p className="text-xl font-bold">ScoutTalent</p>
          </Link>
          <nav className="space-y-6 text-lg">
            <Link to="/Scoutmar"><div className="flex items-center space-x-3 hover:text-blue-300 transition"><Home /><span>Dashboard</span></div></Link><br />
            <Link to="/Agent"><div className="flex items-center space-x-3 hover:text-blue-300 transition"><User /><span>Profile</span></div></Link><br />
            <Link to="/chat"><div className="flex items-center space-x-3 hover:text-blue-300 transition"><Mail /><span>Inbox</span></div></Link><br />
          </nav>
        </div>
      </aside>

      <main className="flex-1 px-10 py-10">
        <h1 className="text-5xl font-bold mb-10 border-b-4 border-blue-300 inline-block pb-2 uppercase tracking-wide">Player Management</h1>

        {message && <div className={`mb-6 p-4 rounded-lg text-center ${message.includes('success') || message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

        {/* My Team Players */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-blue-300 pb-2">My Team Players</h2>
            <button onClick={() => setShowAddForm(true)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">+ Add New Player</button>
          </div>

          {showAddForm && (
            <div className="bg-gray-50 p-6 rounded-xl shadow-md mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Username" className="input" value={newPlayer.username} onChange={e => setNewPlayer({ ...newPlayer, username: e.target.value })} />
                <input type="text" placeholder="Team Name" className="input" value={newPlayer.teamname} onChange={e => setNewPlayer({ ...newPlayer, teamname: e.target.value })} />
                <select className="input" value={newPlayer.position} onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}>
                  <option value="">Select Position</option>
                  <option value="Striker">Striker</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Defender">Defender</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Forward">Forward</option>
                  <option value="Left Winger">Left Winger</option>
                  <option value="Right Winger">Right Winger</option>
                  <option value="Defensive Midfielder">Defensive Midfielder</option>
                </select>
                <input type="text" placeholder="Country" className="input" value={newPlayer.country} onChange={e => setNewPlayer({ ...newPlayer, country: e.target.value })} />
                <input type="number" placeholder="Jersey Number" className="input" value={newPlayer.jersey} onChange={e => setNewPlayer({ ...newPlayer, jersey: e.target.value })} />
                <input type="number" placeholder="Age" className="input" value={newPlayer.age} onChange={e => setNewPlayer({ ...newPlayer, age: e.target.value })} />
                <div className="flex gap-2">
                  <input type="number" placeholder="Feet" className="input" min="4" max="8" value={newPlayer.heightFeet} onChange={e => setNewPlayer({ ...newPlayer, heightFeet: e.target.value })} />
                  <input type="number" placeholder="Inches" className="input" min="0" max="11" value={newPlayer.heightInches} onChange={e => setNewPlayer({ ...newPlayer, heightInches: e.target.value })} />
                </div>
                <input type="number" placeholder="Weight" className="input" value={newPlayer.weight} onChange={e => setNewPlayer({ ...newPlayer, weight: e.target.value })} />
                <select className="input" value={newPlayer.foot} onChange={e => setNewPlayer({ ...newPlayer, foot: e.target.value })}>
                  <option value="">Select Preferred Foot</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                  <option value="Both">Both</option>
                </select>
                <input type="text" placeholder="Profile Image URL" className="input col-span-2" value={newPlayer.image} onChange={e => setNewPlayer({ ...newPlayer, image: e.target.value })} />
              </div>
              <div className="flex space-x-4">
                <button onClick={handleAddNewPlayer} disabled={isLoading} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 transition">{isLoading ? 'Adding...' : 'Add Player'}</button>
                <button onClick={handleCancelAddPlayer} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {players.filter(p => !p.marketed).map(player => (
              <div key={player._id ?? player.username} className="flex justify-between items-center bg-gray-50 shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-6">
                  <img src={player.image || 'https://via.placeholder.com/80'} alt={player.username} className="w-20 h-20 rounded-full object-cover border-2 border-gray-300" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{player.username}</h3>
                    <p className="text-sm text-gray-600">{player.position} • {player.teamname}</p>
                    <p className="text-xs text-gray-500">{player.country} • Age: {player.age}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleSelectVideo(player)}
                    disabled={isLoading || uploadingPlayerKey === getPlayerKey(player)}
                    className="flex items-center gap-2 bg-blue-500 text-white px-5 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-300 text-sm font-medium"
                  >
                    <Video size={16} /> {uploadingPlayerKey === getPlayerKey(player) ? 'Analyzing...' : 'Add Video'}
                  </button>
                  <button onClick={() => addToMarket(player)} disabled={isLoading} className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-300 text-sm font-medium">
                    <Plus size={16} /> {player.marketed ? 'Added' : 'Add to Market'}
                  </button>
                  <button onClick={() => deleteFromTeam(player)} disabled={isLoading} className="flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-300 text-sm font-medium"><Trash2 size={16} /> Delete</button>
                  {player.marketed && <button onClick={() => removeFromMarket(player)} disabled={isLoading} className="flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-300 text-sm font-medium"><Trash2 size={16} /> Remove</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marketed Players */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-blue-300 pb-2 mb-6">Marketed Players</h2>
          <div className="space-y-6">
            {marketToShow.map(player => (
              <div key={player._id ?? player.username} className="flex justify-between items-center bg-gray-50 shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-6">
                  <img src={player.image || 'https://via.placeholder.com/80'} alt={player.username} className="w-20 h-20 rounded-full object-cover border-2 border-gray-300" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{player.username}</h3>
                    <p className="text-sm text-gray-600">{player.position} • {player.teamname}</p>
                    <p className="text-xs text-gray-500">{player.country} • Age: {player.age}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleSelectVideo(player)}
                    disabled={isLoading || uploadingPlayerKey === getPlayerKey(player)}
                    className="flex items-center gap-2 bg-blue-500 text-white px-5 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-300 text-sm font-medium"
                  >
                    <Video size={16} /> {uploadingPlayerKey === getPlayerKey(player) ? 'Analyzing...' : 'Upload Video'}
                  </button>
                  <button onClick={() => removeFromMarket(player)} disabled={isLoading} className="flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-300 text-sm font-medium"><Trash2 size={16} /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
