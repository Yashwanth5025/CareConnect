
import { Link } from 'react-router-dom';
import {FaTwitter, FaInstagram, FaLinkedinIn} from 'react-icons/fa'
import './App.css';

const About = () => {
  return (
    <>
      {/* Header */}
      <header className="bg-[#19325F] text-white fixed top-0 left-0 w-full py-5 z-30 shadow">
        <Link to="/">
          <div className="ml-4 flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dhuado5jg/image/upload/v1753204336/WhatsApp_Image_2025-07-22_at_22.41.44_f1d2277a-removebg-preview_crjayb.png"
              alt="logo"
              className="h-12"
            />
            <p className="text-white font-semibold text-lg">ScoutTalent</p>
          </div>
        </Link>
      </header>

      {/* Hero Banner */}
      <div className="mt-16 relative">
        <img
          src="https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d"
          alt="Football scouting"
          className="w-full h-72 object-cover brightness-75"
        />
        <h1 className="absolute inset-0 flex items-center justify-center text-white text-6xl md:text-5xl font-bold text-center px-4">
          REVOLUTIONIZING FOOTBALL SCOUTING
        </h1>
      </div>

      {/* About Section */}
      <div className="bg-white p-8 md:p-12 text-gray-800 h-full flex flex-col justify-center">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">ABOUT US</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Empowering football scouting with data, precision, and smart tools — built for the future of talent discovery.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-1">
          {/* Global Player Insights */}
          <div className="bg-blue-50 p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-6 min-h-[300px]">
            <img
              src="https://res.cloudinary.com/dg1yaroyb/image/upload/v1761033973/Fifa-1024x683_ke9su2.jpg"
              alt="Global Player Insights"
              className="w-full md:w-1/3 h-56 object-cover rounded-lg"
            />
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <h2 className="font-semibold text-lg mb-2">Global Player Insights</h2>
                <p className="text-sm text-gray-600">
                  Access player data from leagues across the world with filters for age, position, value, and more.
                  Gain access to a vast global scouting network with data on players from top leagues and hidden divisions alike.
                  Track stats, performance trends, and potential using intuitive filters that make international scouting smarter and faster than ever.
                </p>
              </div>
            </div>
          </div>

          {/* Custom Scoring System */}
          <div className="bg-purple-50 p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-6 min-h-[300px]">
            <img
              src="https://res.cloudinary.com/dg1yaroyb/image/upload/v1761035134/birds-eye-view-of-a-football-pitch_tpkrgf.webp"
              alt="Custom Scoring System"
              className="w-full md:w-1/3 h-56 object-cover rounded-lg"
            />
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <h2 className="font-semibold text-lg mb-2">Custom Scoring System</h2>
                <p className="text-sm text-gray-600">
                  Objectively rank players using league strength, team competitiveness, and performance metrics.
                  Incorporates advanced individual statistics—such as goals, assists, defensive actions, pass accuracy, and minutes played—to assess true impact on the field.
                  Scores automatically adapt as leagues, teams, and players evolve, ensuring fairness and up-to-date evaluations.
                </p>
              </div>
            </div>
          </div>

          {/* Built for Scouts */}
          <div className="bg-green-50 p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-6 min-h-[300px]">
            <img
              src="https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=800&q=80"
              alt="Built for Scouts"
              className="w-full md:w-1/3 h-56 object-cover rounded-lg"
            />
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <h2 className="font-semibold text-lg mb-2">Built for Scouts</h2>
                <p className="text-sm text-gray-600">
                  Save searches, register as a scout, and evaluate talent with precision and speed.
                  Find players that fit your exact criteria—by position, age, league, performance stats, or potential rating—in seconds.
                  Save your searches, build personalized watchlists, and monitor player progress over time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-500 italic text-center">
          Whether you're finding the next Ronaldo or building your dream squad, our platform gives you the edge.
        </p>
      </div>

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
    </>
  );
};

export default About;