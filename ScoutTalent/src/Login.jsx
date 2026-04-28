import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import DarkVeil from './Darkveil';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/signup') {
      setIsLogin(false);
    } else if (location.pathname === '/login') {
      setIsLogin(true);
    }
  }, [location.pathname]);

  const [rfdata, setRfdata] = useState({
    username: "",
    phno: "",
    usermail: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [lgdata, setLgdata] = useState({
    userl: "",
    lpass: "",
  });

  const [passwordStrength, setPasswordStrength] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  const handleChange = (e) => {
    setRfdata({
      ...rfdata,
      [e.target.name]: e.target.value,
    });
  };

  const handlelChange = (e) => {
    setLgdata({
      ...lgdata,
      [e.target.name]: e.target.value,
    });
  };

  // Password strength checker
  const checkPasswordStrength = (password) => {
    if (!password) return setPasswordStrength("");
    
    // Strong: 8+ chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    // Medium: 6+ chars, at least 1 letter and 1 number
    const mediumRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (strongRegex.test(password)) {
      setPasswordStrength("Hard");
    } else if (mediumRegex.test(password)) {
      setPasswordStrength("Medium");
    } else {
      setPasswordStrength("Easy");
    }
  };

  // Login submit
  const handlelSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5501/login", lgdata);
      if (res.status === 200) {
        localStorage.removeItem("chatUsername");
        localStorage.removeItem("role");
        localStorage.removeItem("agentEmail");
        localStorage.removeItem("agentPhone");
        const resolvedUsername = (res.data && res.data.username) ? res.data.username : (lgdata.userl || "");
        if (resolvedUsername) localStorage.setItem("chatUsername", resolvedUsername);
        if (res.data && res.data.role) localStorage.setItem("role", res.data.role);
        if (res.data && res.data.usermail) localStorage.setItem("agentEmail", res.data.usermail);
        if (res.data && res.data.phno) localStorage.setItem("agentPhone", res.data.phno);

        if (res.data.path) {
          navigate(res.data.path);
        } else if (res.data.role) {
          switch (res.data.role) {
            case "Player": navigate("/player"); break;
            case "Scout": navigate("/Scoutmar"); break;
            case "Agent": navigate("/Agent"); break;
            default: navigate("/Scoutmar");
          }
        } else {
          navigate("/Scoutmar");
        }
      } else {
        navigate("/login");
      }
    } catch (err) {
      alert("Login failed: " + (err.response?.data?.message || err.message));
      navigate("/login");
    }
  };

  // Signup submit with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, phno, usermail, password,  role } = rfdata;

    if (!username || username.length < 3 || username.length > 15 || !/^[a-zA-Z0-9]+$/.test(username)) {
      return alert("Username must be 3-15 characters, alphanumeric only.");
    }
    if (!usermail || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(usermail)) {
      return alert("Please enter a valid email.");
    }
    if (!phno || !/^\d{10}$/.test(phno)) {
      return alert("Phone number must be 10 digits.");
    }
    // Require 6-12 chars, at least 1 uppercase, 1 lowercase, 1 number
    if (!password || password.length < 6 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return alert("Password must be 6-12 characters and include uppercase, lowercase, and a number.");
    }
    
    if (!role) {
      return alert("Please select a role.");
    }

    try {
      const signupPayload = {
        username: rfdata.username,
        phno: rfdata.phno,
        usermail: rfdata.usermail,
        password: rfdata.password,
        role: rfdata.role,
      };
      const res = await axios.post('http://localhost:5501/register', signupPayload);
      alert('Data sent!');
      if (res.data.path) {
        navigate(res.data.path);
      } else {
        navigate("/login");
      }
    } catch (error) {
      console.error(error);
      alert('Failed to send data.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
      <DarkVeil
        hueShift={20}
        noiseIntensity={0}
        scanlineIntensity={0}
        speed={2.5}
        scanlineFrequency={3}
        warpAmount={0.05}
      />

      <div className="flex w-full max-w-7xl mx-auto shadow-xl rounded-xl overflow-hidden justify-center items-center">
        <div className="w-full md:w-1/2 flex items-center justify-center py-10 relative">
          <Link to="/" className="absolute top-15 left-28 p-2 rounded-full text-[#19325F] hover:bg-gray-100 z-50">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="relative w-[340px] md:w-[420px] h-[460px] md:h-[520px]">
            <div className="bg-white relative w-full h-full rounded-xl overflow-hidden shadow-lg">

              {/* Login Form */}
              <div className={`absolute inset-0 pt-8 md:pt-10 pb-6 md:pb-8 transition-all duration-500 ease-in-out ${isLogin ? 'translate-y-0 opacity-100 z-20' : '-translate-y-full opacity-0 z-10'}`}>
                <h2 className="text-[#19325F] text-center text-2xl md:text-3xl font-bold mb-4 md:mb-6">Login</h2>

                <form onSubmit={handlelSubmit} className="space-y-6 px-6 md:px-8">
                  <input
                    name="userl" value={lgdata.userl} onChange={handlelChange}
                    type="text"
                    placeholder="Email or Username"
                    className="w-full px-4 py-2.5 md:py-3 border border-gray-300 bg-gray-100 text-black rounded-md placeholder-black focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                    autoComplete="username"
                  />
                  <input
                    name="lpass" value={lgdata.lpass} onChange={handlelChange}
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-2.5 md:py-3 border border-gray-300 bg-gray-100 text-black rounded-md placeholder-black focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                    autoComplete="current-password"
                  />
                  <button type="submit" className="w-full bg-[#253B45] text-white font-semibold py-2.5 md:py-3 rounded-md hover:bg-[#1b2e38] transition mt-4 md:mt-6">
                    Login
                  </button>
                </form>

                <div className="absolute bottom-0 left-0 w-full bg-[#335C85] rounded-t-full py-2 md:py-2.5 text-white text-center cursor-pointer hover:bg-[#2b4f72] transition" onClick={() => setIsLogin(false)}>
                  <h2 className="text-base md:text-lg font-semibold">Signup</h2>
                </div>
              </div>

              {/* Signup Form */}
              <div className={`absolute inset-0 pt-6 md:pt-8 pb-6 md:pb-8 bg-[#335C85] transition-all duration-500 ease-in-out ${isLogin ? 'translate-y-full opacity-0 z-10' : 'translate-y-0 opacity-100 z-20'}`}>
                <div className="absolute top-0 left-0 w-full bg-white rounded-b-full text-center cursor-pointer z-10" onClick={() => setIsLogin(true)}>
                  <h2 className="text-[#335C85] text-lg md:text-xl font-semibold pt-1">Login</h2>
                </div>
                <h2 className="text-white text-2xl md:text-3xl font-semibold text-center mb-3 md:mb-4 mt-4">Sign Up</h2>
                <form onSubmit={handleSubmit} className="space-y-3 px-6 md:px-8">
                  <input
                    name="username" value={rfdata.username} onChange={handleChange}
                    type="text"
                    placeholder="Username"
                    className="w-full px-4 py-2.5 md:py-3 text-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                    autoComplete="username"
                  />
                  <input
                    name="usermail" value={rfdata.usermail} onChange={handleChange}
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-2.5 md:py-3 text-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                    autoComplete="email"
                  />
                  <input
                    name="phno" value={rfdata.phno} onChange={handleChange}
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-4 py-2.5 md:py-3 text-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                    autoComplete="tel"
                  />
                  <div className="relative">
                    <input
                      name="password"
                      value={rfdata.password}
                      onChange={(e) => {
                        handleChange(e);
                        checkPasswordStrength(e.target.value);
                      }}
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Password"
                      className="w-full px-4 py-2.5 md:py-3 pr-12 text-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#19325F]"
                    >
                      {showSignupPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {passwordStrength && (
                    <p className={`mt-1 text-sm font-semibold ${
                      passwordStrength === "Easy" ? "text-red-500" :
                      passwordStrength === "Medium" ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      Strength: {passwordStrength}
                    </p>
                  )}
                  
                  <select
                    name="role"
                    value={rfdata.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 md:py-3 text-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#19325F]"
                  >
                    <option value="">Select Role</option>
                    <option value="Player">Player</option>
                    <option value="Scout">Scout</option>
                    <option value="Agent">Agent</option>
                  </select>
                  <button type="submit" className="w-full bg-[#253B45] text-white font-bold text-center py-2.5 md:py-3 rounded-md hover:bg-[#1b2e38] transition">
                    Sign Up
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
