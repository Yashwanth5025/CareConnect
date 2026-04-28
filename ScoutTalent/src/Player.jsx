// Player.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { FaUserCircle, FaPlus, FaMinus, FaTimes } from 'react-icons/fa';
import axios from 'axios';

const data = [
  { stat: 'Goals', value: 11 },
  { stat: 'Assists', value: 11 },
  { stat: 'Tackles', value: 3 },
  { stat: 'Touches', value: 66 },
  { stat: 'Points', value: 67 },
];

const Player = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Weekly schedule state (match Agent.jsx)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    date: '',
    time: '',
    eventName: ''
  });
  const [scheduleData, setScheduleData] = useState([
    { date: 'July 20', activity: 'Training', time: '10:00 AM' },
    { date: 'July 22', activity: 'Match vs Chelsea', time: '4:00 PM' },
    { date: 'July 25', activity: 'Medical Checkup', time: '9:00 AM' },
    { date: 'July 26', activity: 'Recovery', time: '11:00 AM' },
    { date: 'July 27', activity: 'Team Meeting', time: '2:00 PM' },
    { date: 'July 28', activity: 'Press Conference', time: '3:00 PM' },
    { date: 'July 29', activity: 'Strategy Session', time: '1:00 PM' },
    { date: 'July 30', activity: 'Match vs Arsenal', time: '5:00 PM' }
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const chatUsername = localStorage.getItem('chatUsername');
        if (!chatUsername) {
          setCurrentUser('Guest User');
          setIsLoading(false);
          return;
        }
        setCurrentUser(chatUsername);
        const response = await axios.get('http://localhost:5501/api/datao');
        const existingPlayer = response.data.find(player => player.username === chatUsername);
        if (existingPlayer) setPlayerData(existingPlayer);
      } catch (error) {
        console.error('Error fetching player data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Weekly schedule handlers (match Agent.jsx)
  const handleAddEvent = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewEvent({ date: '', time: '', eventName: '' });
  };

  const handleScheduleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitEvent = (e) => {
    e.preventDefault();
    if (newEvent.date && newEvent.time && newEvent.eventName) {
      const newEventData = { date: newEvent.date, activity: newEvent.eventName, time: newEvent.time };
      setScheduleData((prev) => [...prev, newEventData]);
      handleCloseModal();
    }
  };

  const handleDeleteEvent = (index) => {
    setScheduleData((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5] text-[#19325F] font-[Buenard,serif] overflow-hidden">
      <Sidebar />

      <main className="flex-1 p-4 flex items-center justify-center overflow-hidden">
        <div className="max-w-7xl w-full h-[94vh] mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">

          {/* LEFT SIDE */}
          <div className="md:col-span-7 gap-4  flex flex-col justify-between h-full overflow-hidden">

            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl p-4 border-t-4 border-blue-400 flex-1">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={1.5} stroke="currentColor" className="size-6 text-black">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" />
                </svg>
                Upcoming Events
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="pl-3 border-l-4 border-blue-300"><span className="font-semibold">July 20</span> – Training @ 10 AM</li>
                <li className="pl-3 border-l-4 border-green-300"><span className="font-semibold">July 22</span> – Match vs Chelsea</li>
                <li className="pl-3 border-l-4 border-red-300"><span className="font-semibold">July 25</span> – Medical Checkup</li>
              </ul>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white hover:shadow-2xl rounded-2xl transition-all duration-300 p-6 border-t-4 border-purple-400 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.5} stroke="currentColor" className="size-6 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
                  </svg>
                  <h3 className="text-xl font-bold">Weekly Schedule</h3>
                </div>
                <button
                  onClick={handleAddEvent}
                  className="flex items-center justify-center w-8 h-8 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors duration-200"
                  title="Add new event"
                >
                  <FaPlus className="w-4 h-4" />
                </button>
              </div>
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="text-xs uppercase text-gray-600 border-b">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Activity</th>
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((event, index) => (
                    <tr key={index} className={index < scheduleData.length - 1 ? 'border-b' : ''}>
                      <td className="py-2">{event.date}</td>
                      <td>{event.activity}</td>
                      <td>{event.time}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteEvent(index)}
                          className="flex items-center justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                          title="Delete event"
                        >
                          <FaMinus className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl p-4 border-t-4 border-yellow-400 flex-1">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={1.5} stroke="currentColor" className="size-6 text-black">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
                Leaderboard
              </h3>
              <ul className="space-y-1 text-gray-800">
                <li className="border-b pb-1">🥇 Halland – <span className="font-bold">15 Goals</span></li>
                <li className="border-b pb-1">🥈 KDB – <span className="font-bold">12 Assists</span></li>
                <li>🥉 Foden – <span className="font-bold">10 Goals</span></li>
              </ul>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="md:col-span-5 flex flex-col justify-between gap-3 h-full overflow-hidden">

            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-3 flex flex-col items-center flex-1">
              <img
                src={playerData?.image || "https://res.cloudinary.com/dhuado5jg/image/upload/v1752591513/download_i3r7tj.jpg"}
                alt="Player"
                className="rounded-xl w-[120px] h-[120px] mb-2 shadow-md object-cover"
              />
              <div className="flex items-center gap-2 mt-1">
                <FaUserCircle className="text-[#19325F] text-lg" />
                <h2 className="text-base font-bold">{currentUser || 'Guest User'}</h2>
              </div>
              <p className="text-xs text-gray-600">
                {playerData ? `${playerData.teamname} • ${playerData.position}` : 'Complete your profile in Records'}
              </p>
              {playerData && (
                <div className="mt-2 text-center text-xs text-gray-500">
                  <p>Age: {playerData.age} • Height: {playerData.height}</p>
                  <p>Weight: {playerData.weight} • Foot: {playerData.foot}</p>
                  <p>Country: {playerData.country} • Jersey: #{playerData.jersey}</p>
                </div>
              )}
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-2xl p-3 flex flex-col justify-center flex-1">
              <h3 className="text-sm font-semibold text-gray-800 text-center mb-2">Performance</h3>
              <div className="w-full h-44">
                <ResponsiveContainer>
                  <RadarChart data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </main>
      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#19325F]">Add New Event</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div>
                <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  value={newEvent.eventName}
                  onChange={handleScheduleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={newEvent.date}
                  onChange={handleScheduleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={newEvent.time}
                  onChange={handleScheduleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200"
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;