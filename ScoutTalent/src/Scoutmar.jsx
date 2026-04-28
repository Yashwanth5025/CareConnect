import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import UploadCard from "./UploadCard";
import logo from "/logo.png";
import { Home, FileText, MessageSquare, LogOut, Heart, ShoppingCart, MessageCircle } from "lucide-react";
import axios from "axios";

const filters = [
  { label: "Age", options: ["All", "18-25", "26-30", "31-40", "40+"] },
  {
    label: "Position",
    options: [
      "All",
      "Striker",
      "Midfielder",
      "Defender",
      "Goalkeeper",
      "Forward",
      "Left Winger",
      "Right Winger",
      "Defensive Midfielder",
    ],
  },
];

const extra = [
  { common_name: "D. Agger", team_name: "Manchester United", position: "Defender", current_age: 41, country_name: "Guatemala" },
  { common_name: "L. Miller", team_name: "Chelsea", position: "Midfielder", current_age: 44, country_name: "Ireland" },
  { common_name: "A. Stokes", team_name: "Arsenal", position: "Forward", current_age: 37, country_name: "Ireland" },
  { common_name: "J. Defoe", team_name: "Liverpool", position: "Unknown", current_age: 43, country_name: "England" },
  { common_name: "Craig Gordon", team_name: "Manchester City", position: "Goalkeeper", current_age: 43, country_name: "Scotland" },
  { common_name: "R. Wallace", team_name: "Manchester United", position: "Midfielder", current_age: 40, country_name: "Scotland" },
  { common_name: "N. Bendtner", team_name: "Chelsea", position: "Forward", current_age: 37, country_name: "Guatemala" },
  { common_name: "K. Touré", team_name: "Arsenal", position: "Defender", current_age: 44, country_name: "Ivory Coast" },
  { common_name: "B. Mendy", team_name: "Liverpool", position: "Defender", current_age: 44, country_name: "France" },
  { common_name: "D. Murphy", team_name: "Manchester City", position: "Forward", current_age: 42, country_name: "Ireland" },
];

const getPlayerIdentity = (player) =>
  player?._id ||
  player?.display_name ||
  player?.common_name ||
  player?.username ||
  player?.name ||
  `${player?.team_name || player?.teamname || ""}-${player?.position || ""}-${player?.country || player?.country_name || ""}`;

const mergeAgentFields = (basePlayer, marketPlayer) => ({
  ...basePlayer,
  agentUsername:
    marketPlayer?.agentUsername ||
    marketPlayer?.managedByUsername ||
    basePlayer?.agentUsername ||
    basePlayer?.managedByUsername ||
    marketPlayer?.agent?.username ||
    basePlayer?.agent?.username ||
    "",
  agentName:
    marketPlayer?.agentName ||
    basePlayer?.agentName ||
    marketPlayer?.agent?.name ||
    basePlayer?.agent?.name ||
    "",
  agentEmail:
    marketPlayer?.agentEmail ||
    basePlayer?.agentEmail ||
    marketPlayer?.agent?.email ||
    basePlayer?.agent?.email ||
    "",
  agentPhone:
    marketPlayer?.agentPhone ||
    basePlayer?.agentPhone ||
    marketPlayer?.agent?.phone ||
    basePlayer?.agent?.phone ||
    "",
  managedByUsername:
    marketPlayer?.managedByUsername ||
    basePlayer?.managedByUsername ||
    marketPlayer?.agentUsername ||
    basePlayer?.agentUsername ||
    marketPlayer?.agent?.username ||
    basePlayer?.agent?.username ||
    "",
  agent:
    marketPlayer?.agent ||
    basePlayer?.agent ||
    null,
});

const Scoutmar = () => {
  const [pdata, setPdata] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [shortlistedIds, setShortlistedIds] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const scoutId = (typeof window !== "undefined" && window.localStorage)
    ? (localStorage.getItem('chatUsername') || '')
    : '';

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('chatUsername');
    localStorage.removeItem('role');
    localStorage.removeItem('agentEmail');
    localStorage.removeItem('agentPhone');
    navigate('/login');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const marketRes = await fetch("http://localhost:5501/scout/players").then((r) => r.json()).catch(() => []);
        const marketArr = Array.isArray(marketRes) ? marketRes : marketRes?.players || [];
        const mergedMap = new Map();
        for (const p of marketArr) {
          const k = getPlayerIdentity(p);
          if (!mergedMap.has(k)) mergedMap.set(k, mergeAgentFields({ ...p, inMarket: true }, p));
        }

        const combined = Array.from(mergedMap.values());
        setPdata(combined);
      } catch (err) {
        console.error("Combined fetch error:", err);
        setPdata([]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!scoutId) return;

    const loadShortlist = async () => {
      try {
        const response = await axios.get(`http://localhost:5501/shortlists/${encodeURIComponent(scoutId)}`);
        const shortlistPlayers = response.data?.players || [];
        setShortlistedIds(shortlistPlayers.map((player) => String(player.playerId)));
      } catch (error) {
        console.error("Failed to load shortlist", error);
      }
    };

    loadShortlist();
  }, [scoutId]);

  const getPlayerIdentifier = (player) =>
    String(player?._id || player?.playerId || player?.common_name || player?.display_name || player?.username || player?.name || "");

  const openNegotiationChat = (player) => {
    const agentUsername = player?.agentUsername || player?.managedByUsername || player?.agent?.username;
    if (!agentUsername) {
      setStatusMessage("No agent is assigned to this player yet.");
      window.setTimeout(() => setStatusMessage(""), 2500);
      return;
    }

    const playerDisplayName =
      player?.name || player?.display_name || player?.common_name || player?.username || "this player";

    navigate('/chat', {
      state: {
        selectedChat: agentUsername,
        draftMessage: `Hi ${agentUsername}, I'm interested in discussing ${playerDisplayName}. Is the player available for negotiation?`,
      },
    });
  };

  const toggleShortlist = async (player) => {
    if (!scoutId) {
      setStatusMessage("Please log in as a scout to manage shortlists.");
      window.setTimeout(() => setStatusMessage(""), 2500);
      return;
    }

    const playerId = getPlayerIdentifier(player);
    if (!playerId) return;

    try {
      if (shortlistedIds.includes(playerId)) {
        await axios.delete(`http://localhost:5501/shortlists/${encodeURIComponent(scoutId)}/remove/${encodeURIComponent(playerId)}`);
        setShortlistedIds((prev) => prev.filter((id) => id !== playerId));
        setStatusMessage("Removed from shortlist.");
      } else {
        await axios.post(`http://localhost:5501/shortlists/${encodeURIComponent(scoutId)}/add`, {
          ...player,
          playerId,
        });
        setShortlistedIds((prev) => [...prev, playerId]);
        setStatusMessage("Added to shortlist.");
      }
    } catch (error) {
      setStatusMessage(error.response?.data?.error || "Failed to update shortlist.");
    }

    window.setTimeout(() => setStatusMessage(""), 2500);
  };

  const addSelectedToCart = async (player) => {
    if (!scoutId) {
      setStatusMessage("Please log in as a scout to add players to cart.");
      window.setTimeout(() => setStatusMessage(""), 2500);
      return;
    }

    try {
      await axios.post(`http://localhost:5501/cart/${encodeURIComponent(scoutId)}/add`, {
        playerId: getPlayerIdentifier(player),
        name: player.name || player.display_name || player.common_name || player.username,
        common_name: player.common_name || player.display_name || player.username,
        image_url: player.image_url || player.image_path || player.image || "",
        age: player.age || "",
        team_name: player.team_name || player.teamname || "",
        position: player.position || "",
        country: player.country || player.country_name || "",
        height: player.height || "",
        weight: player.weight || "",
        foot: player.foot || "",
        jersey: player.jersey || "",
        agentUsername: player.agentUsername || "",
      });
      setStatusMessage("Player added to cart.");
    } catch (error) {
      setStatusMessage(error.response?.data?.error || "Failed to add player to cart.");
    }

    window.setTimeout(() => setStatusMessage(""), 2500);
  };

  const filteredPlayers = pdata.filter((player) => {
    const matchedExtra = extra.find(
      (e) =>
        e.common_name.toLowerCase().trim() ===
        (player.common_name || "").toLowerCase().trim()
    );
    const playerAge = matchedExtra?.current_age || player.age || "N/A";
    const playerTeam =
      matchedExtra?.team_name ||
      player.team_name ||
      player.teamname ||
      "No Team";
    const playerPosition =
      matchedExtra?.position || player.position || "Unknown Position";
    const playerName =
      player.display_name ||
      player.common_name ||
      player.username ||
      player.playerName ||
      "Unknown Player";
    const playerCountry =
      matchedExtra?.country_name ||
      player.country_name ||
      player.country ||
      player.nationality ||
      "";

    const matchesSearch =
      searchTerm === "" ||
      playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playerTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playerCountry.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAge =
      ageFilter === "All" ||
      (() => {
        const age = parseInt(playerAge);
        if (isNaN(age)) return false;
        switch (ageFilter) {
          case "18-25":
            return age >= 18 && age <= 25;
          case "26-30":
            return age >= 26 && age <= 30;
          case "31-40":
            return age >= 31 && age <= 40;
          case "40+":
            return age > 40;
          default:
            return true;
        }
      })();

    const matchesPosition =
      positionFilter === "All" ||
      playerPosition.toLowerCase().includes(positionFilter.toLowerCase());

    return matchesSearch && matchesAge && matchesPosition;
  });

  useEffect(() => {
    if (!selectedPlayer && filteredPlayers.length > 0) {
      const player = filteredPlayers[0];
      const matchedExtra = extra.find(
        (e) =>
          e.common_name.toLowerCase().trim() ===
          (player.common_name || "").toLowerCase().trim()
      );
      const playerAge = matchedExtra?.current_age || player.age || "N/A";
      const playerTeam =
        matchedExtra?.team_name ||
        player.team_name ||
        player.teamname ||
        "No Team";
      const playerPosition =
        matchedExtra?.position || player.position || "Unknown Position";
      const imageUrl = player.image_path || player.image || player.profileImageUrl || "";
      const playerName =
        player.display_name ||
        player.common_name ||
        player.username ||
        player.playerName ||
        "Unknown Player";
      const playerCountry =
        matchedExtra?.country_name ||
        player.country_name ||
        player.country ||
        player.nationality ||
        "";
      const mergedPlayer = {
        ...player,
        age: playerAge,
        team_name: playerTeam,
        position: playerPosition,
        name: playerName,
        image_url: imageUrl,
        country: playerCountry,
        agentUsername: player.agentUsername || player.agent?.username || "",
        agentName: player.agentName || player.agent?.name || "",
        agentEmail: player.agentEmail || player.agent?.email || "",
        agentPhone: player.agentPhone || player.agent?.phone || "",
      };
      setSelectedPlayer(mergedPlayer);
    }
  }, [filteredPlayers, selectedPlayer]);

  const role = (typeof window !== 'undefined' && window.localStorage)
    ? (localStorage.getItem('role') || '')
    : '';
  const profilePath = role === 'Player' ? '/player' : role === 'Agent' ? '/Agent' : '/Sprofile';

  return (
    <div className="flex min-h-screen bg-white" style={{ fontFamily: "Buenard, serif" }}>
      <aside className="w-60 bg-blue-900 text-white flex flex-col justify-between p-4 fixed h-full left-0 top-0">
        <div>
          <div  className="flex items-center gap-3 mb-6 p-2 rounded-lg hover:bg-blue-800 transition-colors">
                    <img src={logo} alt="ScoutTalent logo" className="w-9 h-9 rounded-full object-cover"/>
                    <span className="text-lg font-semibold tracking-wide">ScoutTalent</span>
                  </div>
          <nav className="space-y-6">
            
            <Link to={profilePath}><div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
              <FileText size={20} />
              <span>Profile</span>
            </div></Link><br />
            <Link to="/chat"><div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
              <MessageSquare size={20} />
              <span>Messages</span>
            </div></Link><br />
            <Link to=""><div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
              <LogOut size={20} />
              <span onClick={handleLogout}>Log Out</span>
            </div></Link><br />
          </nav>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 ml-60">
        {statusMessage && (
          <div className="mx-6 mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            {statusMessage}
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 mt-6 items-center justify-center">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-72"
          />
          {filters.map((filter, idx) => (
            <select
              key={idx}
              value={filter.label === "Age" ? ageFilter : positionFilter}
              onChange={(e) => {
                if (filter.label === "Age") setAgeFilter(e.target.value);
                else setPositionFilter(e.target.value);
              }}
              className="bg-blue-100 text-black px-4 py-2 rounded-md shadow-sm text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {filter.options.map((option, i) => (
                <option key={i} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div className="text-center mt-4 text-gray-600">
          Showing {filteredPlayers.length} of {pdata.length} players
        </div>

        {/* Player Cards */}
        <div className="mt-10 flex flex-col md:flex-row justify-between items-start gap-10 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6 max-w-6xl">
            {filteredPlayers.map((player) => {
              const matchedExtra = extra.find(
                (e) =>
                  e.common_name.toLowerCase().trim() ===
                  (player.common_name || "").toLowerCase().trim()
              );
              const playerAge = matchedExtra?.current_age || player.age || "N/A";
              const playerTeam =
                matchedExtra?.team_name ||
                player.team_name ||
                player.teamname ||
                "No Team";
              const playerPosition =
                matchedExtra?.position || player.position || "Unknown Position";
              const imageUrl =
                player.image_path || player.image || player.profileImageUrl || "";
              const playerName =
                player.display_name ||
                player.common_name ||
                player.username ||
                player.playerName ||
                "Unknown Player";
              const playerCountry =
                matchedExtra?.country_name ||
                player.country_name ||
                player.country ||
                player.nationality ||
                "";
              const mergedPlayer = {
                ...player,
                age: playerAge,
                team_name: playerTeam,
                position: playerPosition,
                name: playerName,
                image_url: imageUrl,
                country: playerCountry,
                agentUsername: player.agentUsername || player.agent?.username || "",
                agentName: player.agentName || player.agent?.name || "",
                agentEmail: player.agentEmail || player.agent?.email || "",
                agentPhone: player.agentPhone || player.agent?.phone || "",
              };
              return (
                <div
                  key={player._id || playerName}
                  onClick={() => setSelectedPlayer(mergedPlayer)}
                  className="cursor-pointer"
                >
                  <UploadCard
                    url={imageUrl}
                    title={playerName}
                    age={playerAge}
                    subtitle={playerPosition}
                    team={playerTeam}
                  />
                </div>
              );
            })}
          </div>

          {selectedPlayer && (
              <div className="fixed top-60 right-8 bg-white border border-gray-200 rounded-2xl shadow-lg w-[350px] p-6 text-center hover:shadow-xl transition-all z-50">
                <img
                  src={selectedPlayer.image_url}
                  alt={
                    selectedPlayer.name ||
                    selectedPlayer.display_name ||
                    selectedPlayer.common_name ||
                    "Player"
                  }
                  className="rounded-xl h-64 w-full object-cover mb-4"
                />
                <div className="text-lg font-bold">
                  {selectedPlayer.name ||
                    selectedPlayer.display_name ||
                    selectedPlayer.common_name ||
                    "Unknown Player"}
                </div>
                <div className="flex justify-between mt-1 text-sm font-semibold">
                  <span>{selectedPlayer.age || "N/A"}</span>
                  <span>{selectedPlayer.position || "Unknown Position"}</span>
                </div>
                <hr className="my-2" />
                <div className="text-sm">
                  {selectedPlayer.team_name ||
                    selectedPlayer.club_name ||
                    "No Team"}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Agent: {selectedPlayer.agentName || selectedPlayer.agentUsername || "Not assigned"}
                </div>
                <div className="mt-5 grid grid-cols-1 gap-2">
                  <Link
                    to={`/PlayerInfo/${encodeURIComponent(
                      selectedPlayer._id ||
                      selectedPlayer.name ||
                        selectedPlayer.display_name ||
                        selectedPlayer.common_name ||
                        selectedPlayer.username
                    )}`}
                    state={{ player: selectedPlayer }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium"
                  >
                    View Full Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleShortlist(selectedPlayer)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Heart size={16} />
                    {shortlistedIds.includes(getPlayerIdentifier(selectedPlayer)) ? "Remove Shortlist" : "Add to Shortlist"}
                  </button>
                  <button
                    type="button"
                    onClick={() => addSelectedToCart(selectedPlayer)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 font-medium flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => openNegotiationChat(selectedPlayer)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Contact Agent
                  </button>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scoutmar;
