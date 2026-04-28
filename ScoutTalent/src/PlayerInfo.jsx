import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Heart, User, ShoppingCart } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getSavedPlayerAnalysis, mergePlayerAnalysis } from './scoutingApi';

const normaliseAgentFields = (player) => {
  if (!player) return player;

  return {
    ...player,
    agentUsername: player.agentUsername || player.managedByUsername || player.agent?.username || '',
    agentName: player.agentName || player.agent?.name || '',
    agentEmail: player.agentEmail || player.agent?.email || '',
    agentPhone: player.agentPhone || player.agent?.phone || '',
    managedByUsername: player.managedByUsername || player.agentUsername || player.agent?.username || '',
  };
};

function App() {
  const [activeTab, setActiveTab] = useState('Info');
  const [isInCart, setIsInCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [shortlistMessage, setShortlistMessage] = useState('');
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [playerRecord, setPlayerRecord] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const player = playerRecord || location.state?.player;
  const activePlayer = useMemo(
    () => normaliseAgentFields(mergePlayerAnalysis(player, getSavedPlayerAnalysis(player))),
    [player]
  );

  useEffect(() => {
    const loadPlayer = async () => {
      try {
        const response = await axios.get(`http://localhost:5501/market/players/find/${encodeURIComponent(id)}`);
        setPlayerRecord(normaliseAgentFields(mergePlayerAnalysis(response.data, getSavedPlayerAnalysis(response.data))));
      } catch (error) {
        console.error('Failed to load player record:', error);
        if (location.state?.player) {
          setPlayerRecord(normaliseAgentFields(mergePlayerAnalysis(location.state.player, getSavedPlayerAnalysis(location.state.player))));
        }
      }
    };

    if (id) loadPlayer();
  }, [id, location.state]);

  useEffect(() => {
    const scoutId = localStorage.getItem('chatUsername');
    const role = localStorage.getItem('role');
    if (role !== 'Scout' || !scoutId || !activePlayer) return;

    const loadShortlistState = async () => {
      try {
        const response = await axios.get(`http://localhost:5501/shortlists/${encodeURIComponent(scoutId)}`);
        const shortlisted = (response.data?.players || []).some((player) =>
          String(player.playerId) === String(activePlayer?._id || activePlayer?.common_name || activePlayer?.display_name || activePlayer?.username || activePlayer?.name)
        );
        setIsShortlisted(shortlisted);
      } catch (error) {
        console.error('Failed to load shortlist state', error);
      }
    };

    loadShortlistState();
  }, [activePlayer]);

  const playerName = useMemo(() => (activePlayer?.name || activePlayer?.display_name || activePlayer?.common_name || 'PLAYER').toUpperCase(), [activePlayer]);
  const playerImage = useMemo(() => (activePlayer?.image_url || activePlayer?.image_path || activePlayer?.image || ''), [activePlayer]);
  const playerAge = useMemo(() => (activePlayer?.age || 'N/A'), [activePlayer]);
  const playerTeam = useMemo(() => (activePlayer?.team_name || activePlayer?.club_name || activePlayer?.teamname || 'Team'), [activePlayer]);
  const playerPosition = useMemo(() => (activePlayer?.position || 'Position'), [activePlayer]);
  const generatedStats = activePlayer?.generatedStats;
  const analytics = activePlayer?.videoAnalysis?.analytics;
  const stats = useMemo(() => {
    if (generatedStats) {
      return {
        goals: generatedStats.goals ?? 0,
        assists: generatedStats.assists ?? 0,
        touches: generatedStats.touches ?? 0,
        tackles: Number(generatedStats.tackles ?? 0).toFixed(1),
        totalPoints: generatedStats.totalPoints ?? 0,
        sprintSpeed: generatedStats.sprintSpeed ?? 0,
        passAccuracy: generatedStats.passAccuracy ?? 0,
        stamina: generatedStats.stamina ?? 0,
        summary: generatedStats.summary || '',
        strengths: generatedStats.strengths || [],
        weaknesses: generatedStats.weaknesses || [],
      };
    }

    const seedBase = (playerName || 'PLAYER').length;
    const rand = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
    return {
      goals: rand(5, 25) + (seedBase % 3),
      assists: rand(3, 20) + (seedBase % 2),
      touches: rand(30, 100), // per 90
      tackles: (Math.random() * 4 + 0.5).toFixed(1), // per game
      totalPoints: rand(80, 240),
      sprintSpeed: rand(28, 36),
      passAccuracy: rand(70, 94),
      stamina: rand(68, 95),
      summary: '',
      strengths: [],
      weaknesses: [],
    };
  }, [generatedStats, playerName]);

  // Add to cart functionality
  const addToCart = async () => {
    if (!activePlayer) return;

    const scoutId = localStorage.getItem('chatUsername');
    if (!scoutId) {
      setCartMessage('Please login to add players to cart');
      setTimeout(() => setCartMessage(''), 2000);
      return;
    }

    try {
      // Create player object for cart
      const cartPlayer = {
        playerId: activePlayer?._id || Date.now().toString(),
        name: playerName,
        common_name: activePlayer?.common_name || activePlayer?.display_name,
        image_url: playerImage,
        age: playerAge,
        team_name: playerTeam,
        position: playerPosition,
        country: activePlayer?.country || activePlayer?.country_name || 'Unknown',
        height: activePlayer?.height || 'N/A',
        weight: activePlayer?.weight || 'N/A',
        foot: activePlayer?.foot || 'N/A',
        jersey: activePlayer?.jersey || 'N/A'
      };

      // Add to cart via API
      const response = await axios.post(`http://localhost:5501/cart/${scoutId}/add`, cartPlayer);
      
      setCartMessage('Added to cart successfully!');
      setIsInCart(true);
      setTimeout(() => {
        setCartMessage('');
        setIsInCart(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 400) {
        setCartMessage('Player already in cart!');
      } else {
        setCartMessage('Failed to add player to cart');
      }
      setIsInCart(true);
      setTimeout(() => {
        setCartMessage('');
        setIsInCart(false);
      }, 2000);
    }
  };

  // Radar chart helpers (5 axes pentagon)
  const radar = useMemo(() => {
    const axes = [
      { key: 'goals', label: 'Goals', value: Number(stats.goals), min: 0, max: 30 },
      { key: 'assists', label: 'Assists', value: Number(stats.assists), min: 0, max: 20 },
      { key: 'tackles', label: 'Tackles', value: Number(stats.tackles), min: 0, max: 6 },
      { key: 'touches', label: 'Touches', value: Number(stats.touches), min: 0, max: 120 },
      { key: 'points', label: 'Points', value: Number(stats.totalPoints), min: 0, max: 250 },
    ];
    const cx = 100, cy = 100, maxR = 80;
    const toPoint = (norm, i) => {
      const angleDeg = -90 + i * 72; // start at top, go clockwise
      const angle = (angleDeg * Math.PI) / 180;
      const r = maxR * Math.max(0, Math.min(1, norm));
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };
    const valuePoints = axes.map((axis, i) => {
      const norm = (axis.value - axis.min) / (axis.max - axis.min);
      const [x, y] = toPoint(norm, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const gridPolygons = [0.2, 0.4, 0.6, 0.8, 1].map(level => axes.map((_, i) => {
      const [x, y] = toPoint(level, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' '));
    const axisLabels = axes.map((axis, i) => {
      const [x, y] = toPoint(1.1, i); // slightly outside
      return { x, y, text: axis.label };
    });
    return { valuePoints, gridPolygons, axisLabels };
  }, [stats]);
  const playerCountry = useMemo(() => (activePlayer?.country || activePlayer?.country_name || 'Country'), [activePlayer]);
  const playerHeight = useMemo(() => (activePlayer?.height || 'Height'), [activePlayer]);
  const playerWeight = useMemo(() => (activePlayer?.weight || 'Weight'), [activePlayer]);
  const playerFoot = useMemo(() => (activePlayer?.foot || 'Foot'), [activePlayer]);
  const playerJersey = useMemo(() => (activePlayer?.jersey || '#'), [activePlayer]);
  const analyticsSummary = useMemo(() => {
    if (!analytics) return null;
    const topPossession = Object.entries(analytics.possession_percentage || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return {
      maxBallVelocity: analytics.ball_velocity?.max_px_per_second ?? 0,
      topPossession,
      shotCount: analytics.shot_count ?? 0,
      goalCount: analytics.goal_count ?? 0
    };
  }, [analytics]);
  const currentRole = useMemo(() => localStorage.getItem('role') || '', []);
  const canScoutPlayer = currentRole === 'Scout';

  const playerIdentifier = useMemo(
    () => String(activePlayer?._id || activePlayer?.common_name || activePlayer?.display_name || activePlayer?.username || activePlayer?.name || ''),
    [activePlayer]
  );

  const toggleShortlist = async () => {
    if (!activePlayer) return;
    const scoutId = localStorage.getItem('chatUsername');
    if (!scoutId) {
      setShortlistMessage('Please login as a scout to manage shortlists.');
      return;
    }

    try {
      if (isShortlisted) {
        await axios.delete(`http://localhost:5501/shortlists/${encodeURIComponent(scoutId)}/remove/${encodeURIComponent(playerIdentifier)}`);
        setIsShortlisted(false);
        setShortlistMessage('Removed from shortlist.');
      } else {
        await axios.post(`http://localhost:5501/shortlists/${encodeURIComponent(scoutId)}/add`, {
          ...activePlayer,
          playerId: playerIdentifier,
        });
        setIsShortlisted(true);
        setShortlistMessage('Added to shortlist.');
      }
    } catch (error) {
      setShortlistMessage(error.response?.data?.error || 'Failed to update shortlist.');
    }

    setTimeout(() => setShortlistMessage(''), 2200);
  };

  const contactAgent = () => {
    const targetAgentUsername = activePlayer?.agentUsername || activePlayer?.managedByUsername || activePlayer?.agent?.username;
    if (!targetAgentUsername) {
      setCartMessage('This player does not have an assigned agent yet.');
      setTimeout(() => setCartMessage(''), 2200);
      return;
    }

    navigate('/chat', {
      state: {
        selectedChat: targetAgentUsername,
        draftMessage: `Hi ${targetAgentUsername}, I'd like to discuss ${playerName}. Please share the next steps for negotiation.`,
      },
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Info':
        return (
          <div className="space-y-6 h-full overflow-y-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <User className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Info</h2>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{playerName}</h1>
              
              {/* Player Number Badge */}
              <div className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-6">
                #{playerJersey}
              </div>
            </div>

            {/* Player Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-blue-800">{playerAge}</div>
                <div className="text-sm text-blue-600">Age</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-blue-800">{playerHeight}</div>
                <div className="text-sm text-blue-600">Height</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-blue-800">{playerWeight}</div>
                <div className="text-sm text-blue-600">Weight</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-blue-800">{playerFoot}</div>
                <div className="text-sm text-blue-600">Foot</div>
              </div>
            </div>

            {/* Career Information */}
            <div className="space-y-4">
              <div className="bg-white border border-blue-200 p-4 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">Current Club</h3>
                <p className="text-gray-700">{playerTeam}</p>
                <p className="text-sm text-gray-500">Joined: June 2023</p>
              </div>
              
              <div className="bg-white border border-blue-200 p-4 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">Position</h3>
                <p className="text-gray-700">{playerPosition}</p>
                <p className="text-sm text-gray-500">Debut: November 2020</p>
              </div>

              <div className="bg-white border border-blue-200 p-4 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">Age</h3>
                <p className="text-gray-700">{playerAge}</p>
              </div>
              <div className="bg-white border border-blue-200 p-4 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">Email</h3>
                <p className="text-gray-700">saisathwikjiddigi@gmail.com</p>
              </div>
            </div>

            {canScoutPlayer && (
              <div className="mt-8 p-4 bg-green-50 rounded-lg">
                <h3 className="font-bold text-green-800 mb-4">Scout Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={addToCart}
                    disabled={isInCart}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                      isInCart 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {isInCart ? 'Added to Cart!' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={toggleShortlist}
                    className="w-full py-3 px-6 rounded-lg font-semibold border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Heart className="w-5 h-5" />
                    {isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                  </button>
                  <button
                    onClick={contactAgent}
                    className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all duration-200"
                  >
                    Contact Agent
                  </button>
                </div>
                <div className="mt-4 text-sm text-slate-600">
                  Agent: {activePlayer?.agentName || activePlayer?.agentUsername || 'Not assigned'}
                </div>
                {!!activePlayer?.agentEmail && (
                  <div className="text-xs text-slate-500 mt-1">Email: {activePlayer.agentEmail}</div>
                )}
                {!!activePlayer?.agentPhone && (
                  <div className="text-xs text-slate-500">Phone: {activePlayer.agentPhone}</div>
                )}
                {cartMessage && (
                  <p className={`text-sm mt-2 text-center ${
                    cartMessage.includes('successfully') || cartMessage.includes('Added') ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {cartMessage}
                  </p>
                )}
                {shortlistMessage && (
                  <p className="text-sm mt-2 text-center text-blue-700">{shortlistMessage}</p>
                )}
              </div>
            )}
          </div>
        );
      case 'Stats':
        return (
          <div className="space-y-6 h-full overflow-y-auto">
            {/* Stats Title */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Stats</h2>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{playerName}</h1>
              
              {/* Goals Badge (randomized) */}
              <div className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-6">
                Goals: {stats.goals}
              </div>
            </div>

            {/* Radar Chart Container */}
            <div className="flex justify-center mb-8">
              <div className="relative w-64 h-64">
                {/* Radar Chart Background */}
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  {/* Grid Lines (concentric pentagons) */}
                  <g stroke="#e5e7eb" strokeWidth="1" fill="none">
                    {radar.gridPolygons.map((pts, i) => (
                      <polygon key={i} points={pts} />
                    ))}
                  </g>
                  {/* Axes */}
                  <g stroke="#e5e7eb" strokeWidth="1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const angleDeg = -90 + i * 72;
                      const angle = (angleDeg * Math.PI) / 180;
                      const x = 100 + 80 * Math.cos(angle);
                      const y = 100 + 80 * Math.sin(angle);
                      return <line key={i} x1="100" y1="100" x2={x} y2={y} />;
                    })}
                  </g>
                  {/* Data polygon */}
                  <polygon
                    points={radar.valuePoints}
                    fill="rgba(16, 185, 129, 0.3)"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </svg>
                {/* Labels */}
                {radar.axisLabels.map((lbl, i) => (
                  <div key={i} style={{ position: 'absolute', left: lbl.x, top: lbl.y, transform: 'translate(-50%, -50%)' }} className="text-[10px] font-medium text-gray-700">
                    {lbl.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Pills (randomized) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Total points: {stats.totalPoints}
              </div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Assists: {stats.assists}
              </div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Touches per 90: {stats.touches}
              </div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Tackles: {stats.tackles} per game
              </div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Sprint speed: {stats.sprintSpeed}
              </div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Pass accuracy: {stats.passAccuracy}%
              </div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                Stamina: {stats.stamina}
              </div>
            </div>

            {/* Performance Note */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-700 text-sm leading-relaxed">
                {stats.summary || 'Upload and analyze a player video from the player list to generate scouting notes.'}
              </p>
            </div>

            {!!stats.strengths.length && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">Strengths</h3>
                <p className="text-sm text-gray-700">{stats.strengths.join(', ')}</p>
              </div>
            )}

            {!!stats.weaknesses.length && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <h3 className="font-bold text-orange-800 mb-2">Weaknesses</h3>
                <p className="text-sm text-gray-700">{stats.weaknesses.join(', ')}</p>
              </div>
            )}

            {analyticsSummary && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-bold text-slate-800 mb-3">Video Analytics JSON</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-3 rounded-md border border-slate-200">
                    <div className="font-semibold text-slate-800">{analyticsSummary.maxBallVelocity}</div>
                    <div className="text-slate-500">Max Ball Velocity (px/s)</div>
                  </div>
                  <div className="bg-white p-3 rounded-md border border-slate-200">
                    <div className="font-semibold text-slate-800">{analyticsSummary.shotCount}</div>
                    <div className="text-slate-500">Shot Events</div>
                  </div>
                  <div className="bg-white p-3 rounded-md border border-slate-200">
                    <div className="font-semibold text-slate-800">{analyticsSummary.goalCount}</div>
                    <div className="text-slate-500">Goal Events</div>
                  </div>
                  <div className="bg-white p-3 rounded-md border border-slate-200">
                    <div className="font-semibold text-slate-800">
                      {analyticsSummary.topPossession ? `Track ${analyticsSummary.topPossession[0]}: ${analyticsSummary.topPossession[1]}%` : 'N/A'}
                    </div>
                    <div className="text-slate-500">Top Possession</div>
                  </div>
                </div>
                <pre className="mt-4 bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(analytics, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      case 'Health':
        return (
          <div className="space-y-6 h-full overflow-y-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Heart className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Health</h2>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
              </p>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">98%</div>
                  <div className="text-sm text-blue-600">Fitness Level</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">72 bpm</div>
                  <div className="text-sm text-blue-600">Resting Heart Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">8.2%</div>
                  <div className="text-sm text-blue-600">Body Fat</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">68 kg</div>
                  <div className="text-sm text-blue-600">Muscle Mass</div>
                </div>
              </div>

              {/* Additional padding to maintain consistent height */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700 text-sm leading-relaxed">
                  Maintaining peak physical condition is crucial for professional performance. Regular monitoring of vital statistics ensures optimal gameplay and injury prevention.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-100 to-blue-200">
      <div className="w-full h-full bg-white overflow-hidden">
        {/* Flex wrapper with fixed height */}
        <div className="flex h-full">
          {/* Left Side - Football Field */}
          <div className="w-1/2 bg-gradient-to-br from-blue-800 to-blue-900 p-8 relative flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-lg relative overflow-hidden shadow-2xl">
              {/* Player Image */}
              <div className="w-full h-full relative">
                <img 
                  src={playerImage || "https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop"}
                  alt={playerName}
                  className="w-full h-full object-cover"
                />
                
                {/* Player Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="text-white">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                         {playerJersey}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{playerName}</h3>
                        <p className="text-sm text-gray-300">{playerPosition}</p>
                      </div>
                    </div>
                    <div className="flex space-x-4 text-xs">
                      <span className="bg-blue-600/80 px-2 py-1 rounded">{playerTeam}</span>
                      <span className="bg-blue-600/80 px-2 py-1 rounded">{playerCountry}</span>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-4 right-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Tabs and Content */}
          <div className="w-1/2 p-8 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex space-x-1 mb-8 bg-blue-100 p-1 rounded-lg">
              {['Info', 'Stats', 'Health'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-blue-900 shadow-sm'
                      : 'text-blue-600 hover:text-blue-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-hidden">{renderTabContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
