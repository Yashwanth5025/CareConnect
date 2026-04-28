import React from 'react'
import { Link } from 'react-router-dom'

const Signup = () => {
  return (
    <div className="min-h-screen bg-[url(/IMG-20250711-WA0009.jpg)] bg-no-repeat bg-cover bg-center font-sans text-white">
      {/* Top Navbar */}
      <Link to="/">
      <div className="bg-[#1a2b44] flex flex-row items-center px-6 py-4">
        <img src="https://res.cloudinary.com/dhuado5jg/image/upload/v1753204336/WhatsApp_Image_2025-07-22_at_22.41.44_f1d2277a-removebg-preview_crjayb.png" alt="Logo" className=" h-10 rounded-full" />
        <p>ScoutTalent</p>
      </div></Link>

      {/* Headings */}
      <div className="text-center mt-12 px-4">
        <h1 className="text-2xl md:text-4xl font-semibold mb-2">
          Your chance to build ultimate team
        </h1>
        <h2 className="text-xl md:text-2xl font-medium text-gray-300 mb-10">
          Opportunity for every player
        </h2>
      </div>

      {/* Role Cards */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-20 px-4">
        {/* Agent */}
        <Link to="/Playerlist">
          <div className="bg-blue-200 text-black rounded-xl px-6 py-4 shadow-md w-48 text-center">
            <h3 className="text-lg font-bold mb-1">Agent</h3>
            <p className="text-sm mt-1">Manage transfer details of your players</p>
          </div>
        </Link>

        {/* Scout */}
        <Link to="/Scoutmar">
          <div className="bg-blue-200 text-black rounded-xl px-6 py-4 shadow-md w-48 text-center">
            <h3 className="text-lg font-bold mb-1">Scout</h3>
            <p className="text-sm mt-1">Find better players for your team</p>
          </div>
        </Link>

        {/* Player */}
        <Link to="/Player">
          <div className="bg-blue-200 text-black rounded-xl px-6 py-4 shadow-md w-48 text-center">
            <h3 className="text-lg font-bold mb-1">Player</h3>
            <p className="text-sm mt-1">Find your chance and prove yourself</p>
          </div>
        </Link>
      </div>

      {/* Footer Statement */}
      <div className="text-center mt-16 px-4">
        <h1 className="text-xl md:text-3xl font-light tracking-wide leading-tight">
          WE BELIEVE IN SPORTS <br />
          AND TEAMS BELIEVE IN US
        </h1>
      </div>
    </div>
  )
}

export default Signup
