import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '/logo.png'
import {Link} from 'react-router-dom';
import {ArrowLeft} from 'lucide-react'


function PlayerInformationForm() {
  const [formData, setFormData] = useState({
    playerName: '',
    teamName: '',
    position: '',
    country: '',
    jerseyNumber: '',
    age: '',
    height: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    preferredFoot: '',
    profileImageUrl: ''
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');

  // Check if user has existing player details
  useEffect(() => {
    const checkUserDetails = async () => {
      try {
        // Get current user from localStorage (set during login)
        const chatUsername = localStorage.getItem('chatUsername');
        if (!chatUsername) {
          setMessage('Please login first to access this page.');
          setIsLoading(false);
          return;
        }

        setCurrentUser(chatUsername);

        // Check if user already has player details
        const response = await axios.get("http://localhost:5501/api/datao");
        const existingPlayer = response.data.find(player => 
          player.username === chatUsername
        );

        if (existingPlayer) {
          // User has existing details, populate form for editing
          setFormData({
            playerName: existingPlayer.username || '',
            teamName: existingPlayer.teamname || '',
            position: existingPlayer.position || '',
            country: existingPlayer.country || '',
            jerseyNumber: existingPlayer.jersey || '',
            age: existingPlayer.age || '',
            height: existingPlayer.height || '',
            weight: existingPlayer.weight || '',
            preferredFoot: existingPlayer.foot || '',
            profileImageUrl: existingPlayer.image || ''
          });
          setIsEditMode(true);
          setMessage('You already have player details. You can edit them below.');
        } else {
          // User doesn't have details, show add form
          setIsEditMode(false);
          setMessage('Please add your player details below.');
        }
      } catch (error) {
        console.error('Error checking user details:', error);
        setMessage('Error loading your details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserDetails();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setMessage('Please login first to submit your details.');
      return;
    }

    try {
      const feet = formData.heightFeet?.toString().trim() || '';
      const inches = formData.heightInches?.toString().trim() || '';
      const hasFeetInches = feet !== '' || inches !== '';
      const heightStr = hasFeetInches ? `${feet || 0}'${inches || 0}` : '';
      if (isEditMode) {
        // Update existing player details
        const updateData = {
          username: formData.playerName,
          teamname: formData.teamName,
          position: formData.position,
          country: formData.country,
          jersey: formData.jerseyNumber,
          age: formData.age,
          height: hasFeetInches ? heightStr : formData.height,
          weight: formData.weight,
          foot: formData.preferredFoot,
          image: formData.profileImageUrl
        };

        // Find the existing player record
        const response = await axios.get('http://localhost:5501/api/datao');
        const existingPlayer = response.data.find(player => 
          player.username === currentUser
        );

        if (existingPlayer) {
          // Update the existing record
          await axios.put(`http://localhost:5501/api/datao/${existingPlayer._id}`, updateData);
          setMessage('Your player details have been updated successfully!');
        } else {
          setMessage('Error: Could not find your existing record to update.');
        }
      } else {
        // Add new player details
        const payload = {
          playerName: formData.playerName,
          teamName: formData.teamName,
          position: formData.position,
          country: formData.country,
          jerseyNumber: formData.jerseyNumber,
          age: formData.age,
          height: hasFeetInches ? heightStr : formData.height,
          weight: formData.weight,
          preferredFoot: formData.preferredFoot,
          profileImageUrl: formData.profileImageUrl,
        };
        await axios.post('http://localhost:5501/Offplayers', payload);
        setMessage('Your player details have been added successfully!');
        setIsEditMode(true);
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      setMessage(`Failed to ${isEditMode ? 'update' : 'add'} your details. Please try again.`);
    }
  };



  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your details...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
    <div className="flex min-h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5]">
      <div className="absolute top-6 left-6 flex items-center bg-[#0D47A1] text-white px-4 py-2 rounded-lg shadow-lg space-x-2">
          <Link to="/player" className=" rounded-full text-white  z-50">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          <img
            src={logo}
            alt="ScoutTalent Logo"
            className="w-6 h-6"
          />
          <span className="font-semibold text-lg">ScoutTalent</span>
        
      </div>
    <div className="max-w-xl mx-auto p-8 bg-blue-50 rounded-xl shadow-md mt-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-blue-200 text-blue-600 rounded-full p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 21a6 6 0 0 1 12 0"/>
          </svg>
        </span>
        <h2 className="text-2xl font-semibold">
          {isEditMode ? 'Edit Player Information' : 'Player Information'}
        </h2>
      </div>
      
      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg text-center ${
          message.includes('successfully') ? 'bg-green-100 text-green-700' : 
          message.includes('Error') ? 'bg-red-100 text-red-700' : 
          'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}
      
      <p className="text-gray-500 mb-6">
        {isEditMode ? 'Update your player profile details' : 'Complete your player profile details'}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Player Name *</label>
            <input
              name="playerName"
              value={formData.playerName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="Enter player name"
              type="text"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Team Name *</label>
            <input
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="Enter team name"
              type="text"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Position *</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
            >
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
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Country *</label>
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="Enter country name"
              type="text"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Jersey Number</label>
            <input
              name="jerseyNumber"
              value={formData.jerseyNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="e.g., 9, 10"
              type="number"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Age</label>
            <input
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="e.g., 25"
              type="number"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Height</label>
            <div className="flex gap-2">
              <input
                name="heightFeet"
                value={formData.heightFeet}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
                placeholder="Feet"
                type="number"
                min="4"
                max="8"
              />
              <input
                name="heightInches"
                value={formData.heightInches}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
                placeholder="Inches"
                type="number"
                min="0"
                max="11"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Weight</label>
            <input
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="e.g., 75"
              type="number"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Preferred Foot</label>
            <select
              name="preferredFoot"
              value={formData.preferredFoot}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
            >
              <option value="">Select Preferred Foot</option>
              <option value="Left">Left</option>
              <option value="Right">Right</option>
              <option value="Both">Both</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Profile Image URL</label>
            <input
              name="profileImageUrl"
              value={formData.profileImageUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="https://example.com/player-photo.jpg"
              type="url"
            />
          </div>
        </div>
        <button className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition" type="submit">
          {isEditMode ? 'Update Details' : 'Add Details'}
        </button>
      </form>
    </div>
    </div>
    </div>
  );
}

export default PlayerInformationForm;