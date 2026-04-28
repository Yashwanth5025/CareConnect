import { Link } from 'react-router-dom'
import {FaTwitter, FaInstagram, FaLinkedinIn} from 'react-icons/fa'
import logo from '/logo.png'

const players = [
  {
    name: "Lionel Messi",
    position: "Forward",
    club: "Inter Miami",
    logo: "https://res.cloudinary.com/dhuado5jg/image/upload/v1752773027/download-removebg-preview_6_sws593.png",
  },
  {
    name: "Kylian Mbappé",
    position: "Forward",
    club: "Real Madrid",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  },
  {
    name: "Kevin De Bruyne",
    position: "Midfielder",
    club: "Manchester City",
    logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  },
  {
    name: "Virgil van Dijk",
    position: "Defender",
    club: "Liverpool",
    logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  },
  {
    name: "Thibaut Courtois",
    position: "Goalkeeper",
    club: "Real Madrid",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  },
  {
    name: "Jude Bellingham",
    position: "Midfielder",
    club: "Real Madrid",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  },
];

const footballClubs = [
  { name: "Real Madrid", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg" },
  { name: "Barcelona", logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg" },
  { name: "Liverpool", logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg" },
  { name: "AC Milan", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg" },
  { name: "Manchester United", logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg" },
  { name: "Bayern Munich", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/2048px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png" },
];

function App() {
  return (
    <div className="min-h-screen bg-cover bg-center">
      <header className="bg-[#19325F] text-white p-4 flex items-center justify-between shadow-md">
        <a href="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt="ScoutTalent logo"
            className="h-10"
          />
          <p className="font-bold text-base">ScoutTalent</p>
        </a>

        <h1 className="text-lg md:text-2xl font-bold text-center flex-1">
          Discover the Next Football Superstar
        </h1>

        <div className="flex gap-6 text-sm">
          <a href="/About" className="hover:underline">About Us</a>
          <a href="/login" className="hover:underline">Login</a>
        </div>
      </header>

      <main className="flex flex-col bg-white/80 backdrop-blur-sm">

        <div className="p-6 bg-[#f9fbff]">
          <section className="w-full mt-5">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
              Choose Your Path with ScoutTalent
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">

              <div className="bg-gradient-to-br from-blue-100 via-gray-50 to-blue-200 rounded-xl shadow-lg p-8 text-center hover:shadow-2xl transition-transform duration-300 hover:scale-105 border-4 border-gray-800">
                <div className="mb-8">
                  <img
                    src="https://res.cloudinary.com/dtfmbx1ww/image/upload/v1757162844/Scoutttt_kp7hgm.jpg"
                    alt="Scout"
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-blue-500 shadow-lg bg-gradient-to-r from-blue-400 to-blue-600 p-1"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Scout</h3>
                <p className="text-sm mb-6 leading-relaxed text-gray-600">
                  Find better players for your team. Evaluate talented players for clubs, academics, or national teams.
                </p>
                <Link to="/Login">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 uppercase tracking-wide">
                  JOIN AS SCOUT
                </button>
                </Link>
              </div>

              <div className="bg-gradient-to-br from-blue-100 via-gray-50 to-blue-200 rounded-xl shadow-lg p-8 text-center hover:shadow-2xl transition-transform duration-300 hover:scale-105 border-4 border-gray-800">
                <div className="mb-8">
                  <img
                    src="https://res.cloudinary.com/dtfmbx1ww/image/upload/v1757162889/player_pxuqq5.jpg"
                    alt="Player"
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-blue-500 shadow-lg bg-gradient-to-r from-blue-400 to-blue-600 p-1"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Player</h3>
                <p className="text-sm mb-6 leading-relaxed text-gray-600">
                  Find your chance and prove yourself. Represent your club or country, and build your professional career.
                </p>
                <Link to="/Login">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 uppercase tracking-wide">
                  JOIN AS PLAYER
                </button>
                </Link>
              </div>

              <div className="bg-gradient-to-br from-blue-100 via-gray-50 to-blue-200 rounded-xl shadow-lg p-8 text-center hover:shadow-2xl transition-transform duration-300 hover:scale-105 border-4 border-gray-800">
                <div className="mb-8">
                  <img
                    src="https://res.cloudinary.com/dtfmbx1ww/image/upload/v1757162933/Agent_xo2vr4.jpg"
                    alt="Agent"
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-blue-500 shadow-lg bg-gradient-to-r from-blue-400 to-blue-600 p-1"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Agent</h3>
                <p className="text-sm mb-6 leading-relaxed text-gray-600">
                  Manage transfer details of players. Handle contracts, bonuses, and promotional appearances.
                </p>
                <Link to="/Login">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 uppercase tracking-wide">
                  JOIN AS AGENT
                </button>
                </Link>
              </div>

            </div>
          </section>
        </div>

        <div className="p-6 bg-[#f0f4f8]">
          <section className="w-full mt-5">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
              Star Players from Top Football Clubs
            </h2>

            <div className="overflow-hidden whitespace-nowrap">
              <div className="flex animate-scroll-left w-max">
                {[...players, ...players].map((player, index) => (
                  <div
                    key={`row1-${index}`}
                    className="bg-white rounded-xl shadow-lg p-4 m-2 flex items-center gap-4 min-w-[280px] transition-transform duration-300 hover:scale-105"
                  >
                    <img src={player.logo} alt={`${player.club} logo`} className="w-12 h-12 object-contain" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">{player.name}</h2>
                      <p className="text-sm text-gray-500">{player.position}</p>
                      <p className="text-xs text-gray-400">{player.club}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-[#f0f4f8]">
          <section className="w-full mt-5">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
              Top Football Clubs
            </h2>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {footballClubs.map((club, index) => (
                  <div
                    key={`club-${index}`}
                    className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    <img
                      src={club.logo}
                      alt={`${club.name} logo`}
                      className="w-16 h-16 md:w-20 md:h-20 object-contain mb-3"
                    />
                    <h3 className="text-lg font-semibold text-gray-800 text-center">
                      {club.name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

          <footer className="bg-[#19325F] text-white">
      {/* Top Section */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Brand Info */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">
            Football Scouting
          </h2>
          <p className="text-blue-100 text-sm leading-6">
            Discover, analyze, and compare football talents with data-driven insights.
            Your all-in-one scouting companion for the modern game.
          </p>
        </div>

        {/* Features */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Features</h3>
          <ul className="space-y-2 text-blue-100 text-sm">
            <li><a href="#" className="hover:text-white transition">Player physical condition</a></li>
            
            <li><a href="#" className="hover:text-white transition">Scout Dashboard</a></li>
            <li><a href="#" className="hover:text-white transition">Performance Tracker</a></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Resources</h3>
          <ul className="space-y-2 text-blue-100 text-sm">
            <li><a href="https://1drv.ms/w/c/7723a0fa57c5ec2a/ETyIpMhK3M1ErswnTXFFRWoBWUo3UJjVDJAkqrMHdA0t1w?e=bcWaNe" className="hover:text-white transition">Documentation</a></li>
      
            <li><Link to="/ContactUs" className="hover:text-white transition">Contact Us</Link></li>
          </ul>
        </div>

        {/* Contact / Socials */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Connect</h3>
          <ul className="space-y-2 text-blue-100 text-sm">
            <li>Email: <a href="mailto:support@footballscouting.com" className="hover:text-white transition">support@footballscouting.com</a></li>
            <li>Location: Hyderabad , India</li>
          </ul>

          <div className="flex space-x-4 mt-4">
            <a href="#" aria-label="Twitter" className="hover:text-blue-300 transition"><FaTwitter size={20} /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-blue-300 transition"><FaLinkedinIn size={20} /></a>
            <a href="#" aria-label="Instagram" className="hover:text-blue-300 transition"><FaInstagram size={20} /></a>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bg-[#19325F] border-t border-blue-700 py-4">
        <p className="text-center text-blue-200 text-sm">
          © 2025 Football Scouting Made Easy. All rights reserved.
        </p>
      </div>
    </footer>
 
    </div>
  );
}

export default App;