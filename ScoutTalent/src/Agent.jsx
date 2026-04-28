import React, { useEffect, useRef, useState } from 'react';
import { FaHandshake, FaPlus, FaMinus, FaTimes } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, User, LogOut, Edit3, Save, X } from 'lucide-react';
import axios from 'axios';
import logo from "/logo.png";

const Agent = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    usermail: '',
    phno: '',
    profileImage: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask about your managed players, recent scouting uploads, or who looks strongest for negotiation. This assistant is ready for a local Ollama model such as Gemma or Qwen.'
    }
  ]);
  const assistantScrollRef = useRef(null);
  // Weekly schedule state (mirrors Player.jsx)
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
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('chatUsername');
    localStorage.removeItem('role');
    localStorage.removeItem('agentEmail');
    localStorage.removeItem('agentPhone');
    navigate('/login');
  };

  const handleEdit = () => {
    setEditForm({
      usermail: user?.usermail || '',
      phno: user?.phno || '',
      profileImage: user?.profileImage || ''
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      usermail: '',
      phno: '',
      profileImage: ''
    });
    setMessage('');
  };

  const handleSave = async () => {
    if (!editForm.usermail || !editForm.phno) {
      setMessage('Please fill in all fields');
      return;
    }

    if (!user?.username) {
      setMessage('User information not available');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.put(`http://localhost:5501/users/${user.username}`, {
        usermail: editForm.usermail,
        phno: editForm.phno,
        profileImage: editForm.profileImage
      });

      setUser(response.data);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      if (error.response?.status === 400) {
        setMessage(error.response.data.error || 'Invalid data provided');
      } else if (error.response?.status === 404) {
        setMessage('User not found');
      } else if (error.response?.status === 500) {
        setMessage('Server error. Please try again later.');
      } else if (error.code === 'ECONNREFUSED') {
        setMessage('Cannot connect to server. Please check if backend is running.');
      } else {
        setMessage('Failed to update profile. Please try again.');
      }
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  // Weekly schedule handlers (adapted to avoid name clash with profile input handler)
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

  useEffect(() => {
    const username = localStorage.getItem('chatUsername');
    if (!username) return;
    fetch('http://localhost:5501/users')
      .then((r) => r.json())
      .then((list) => {
        const me = (list || []).find((u) => u.username === username) || null;
        setUser(me);
        if (me?.usermail) localStorage.setItem('agentEmail', me.usermail);
        if (me?.phno) localStorage.setItem('agentPhone', me.phno);
      })
      .catch((err) => console.error('Error fetching users:', err));
  }, []);

  useEffect(() => {
    assistantScrollRef.current?.scrollTo({
      top: assistantScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [assistantMessages]);

  const handleAssistantSend = async () => {
    const trimmed = assistantInput.trim();
    if (!trimmed || assistantLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const nextMessages = [...assistantMessages, userMessage];
    setAssistantMessages(nextMessages);
    setAssistantInput('');
    setAssistantLoading(true);

    try {
      const response = await axios.post('http://localhost:5501/agent/assistant', {
        message: trimmed,
        agentUsername: displayName,
        history: nextMessages.slice(-8),
      });

      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data?.reply || 'No reply generated.'
      }]);
    } catch (error) {
      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        content: error.response?.data?.details || error.response?.data?.error || 'Assistant is unavailable right now.'
      }]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const displayName = user?.username || 'Agent';
  const displayEmail = user?.usermail || 'agent@example.com';
  const displayPhone = user?.phno || 'N/A';

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5] font-sans text-[#19325F] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-blue-900 text-white flex flex-col justify-between p-4 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer mb-6">
            
              <img src={logo} alt="ScoutTalent logo" className="w-8 h-8 object-contain" />
            
            
              <p className="text-xl font-semibold text-white">ScoutTalent</p>
            
          </div>
          <nav className="space-y-6 mt-10">
            <Link to="/Scoutmar">
              <div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
                <Home size={20} />
                <span>Dashboard</span>
              </div>
            </Link>
            <br />
            <Link to="/Playerlist">
              <div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
                <User size={20} />
                <span>My Players</span>
              </div>
            </Link>
            <br />
            <Link to="/chat">
              <div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
                <MessageSquare size={20} />
                <span>Messages</span>
              </div>
            </Link>
          </nav>
        </div>

        {/* Logout Button */}
        <div
          className="flex items-center gap-3 cursor-pointer hover:text-blue-300 absolute bottom-4 left-4"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 flex items-center justify-center overflow-hidden">
        <div className="max-w-7xl w-full h-[94vh] mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
          
          {/* LEFT SIDE */}
          <div className="md:col-span-7 flex flex-col gap-3 h-full overflow-hidden">
            {/* Upcoming Meetings */}
            <div className="bg-white rounded-2xl p-4 border-t-4 border-blue-400 flex-[1]">
              <h3 className="text-xl font-bold mb-3">Upcoming Meetings</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="pl-3 border-l-4 border-blue-300">
                  <span className="font-semibold">Aug 10</span> – Contract Negotiation @ Chelsea
                </li>
                <li className="pl-3 border-l-4 border-green-300">
                  <span className="font-semibold">Aug 14</span> – Transfer Meeting @ PSG
                </li>
                <li className="pl-3 border-l-4 border-red-300">
                  <span className="font-semibold">Aug 18</span> – Sponsorship Call
                </li>
              </ul>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white hover:shadow-2xl rounded-2xl transition-all duration-300 p-6 border-t-4 border-purple-400 flex-[2] overflow-y-auto">
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
                                  <tr key={index} className={index < scheduleData.length - 1 ? "border-b" : ""}>
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

            
          </div>

          {/* RIGHT SIDE */}
          <div className="md:col-span-5 flex flex-col justify-between gap-3 h-full overflow-hidden">
            
            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center w-full flex-1">
              <div className="flex justify-end w-full mb-1">
                <button
                  onClick={isEditing ? handleCancel : handleEdit}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title={isEditing ? 'Cancel' : 'Edit Profile'}
                >
                  {isEditing ? <X size={16} className="text-red-500" /> : <Edit3 size={16} className="text-blue-500" />}
                </button>
              </div>

              <img
                src={editForm.profileImage || user?.profileImage || "https://res.cloudinary.com/dhuado5jg/image/upload/v1752591513/download_i3r7tj.jpg"}
                alt="Agent"
                className="rounded-xl w-[180px] h-[180px] mb-2 shadow-md object-cover"
              />
              <div className="flex items-center gap-2 mt-1">
                <FaHandshake className="text-[#19325F] text-lg" />
                <h2 className="text-base font-bold">{displayName}</h2>
              </div>
              <p className="text-xs text-gray-600">FIFA Licensed Agent</p>

              {isEditing ? (
                <div className="mt-3 w-full space-y-2">
                  <input
                    type="url"
                    name="profileImage"
                    value={editForm.profileImage}
                    onChange={handleInputChange}
                    placeholder="Profile Image URL"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    name="usermail"
                    value={editForm.usermail}
                    onChange={handleInputChange}
                    placeholder="Email"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    name="phno"
                    value={editForm.phno}
                    onChange={handleInputChange}
                    placeholder="Phone"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex-1 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isLoading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save size={12} />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-gray-500 text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-gray-600 flex items-center justify-center gap-1"
                    >
                      <X size={12} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-center text-xs">
                  <p className="text-gray-500 mb-1">Email: {displayEmail}</p>
                  <p className="text-gray-500">Phone: {displayPhone}</p>
                </div>
              )}

              {message && (
                <div
                  className={`mt-2 text-xs text-center px-3 py-1 rounded ${
                    message.includes('successfully')
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}
            </div>

            {/* Agent Assistant */}
            <div className="bg-white rounded-2xl p-4 border-t-4 border-yellow-400 w-full flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base md:text-lg font-bold text-gray-800">Agent Assistant</h3>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Ollama Chat</span>
              </div>
              <div ref={assistantScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
                {assistantMessages.map((entry, index) => (
                  <div
                    key={`${entry.role}-${index}`}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      entry.role === 'assistant'
                        ? 'bg-blue-50 text-gray-800'
                        : 'bg-blue-600 text-white ml-8'
                    }`}
                  >
                    {entry.content}
                  </div>
                ))}
                {assistantLoading && (
                  <div className="rounded-xl px-3 py-2 text-sm bg-blue-50 text-gray-800">
                    Thinking...
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAssistantSend();
                  }}
                  placeholder="Ask about transfers, contracts, or players..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={handleAssistantSend}
                  disabled={assistantLoading || !assistantInput.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
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

export default Agent;
