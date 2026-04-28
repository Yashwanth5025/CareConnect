
import { Link, useNavigate } from 'react-router-dom';
import logo from "/logo.png";
import { Home, FileText, MessageSquare, LogOut } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('chatUsername');
    localStorage.removeItem('role');
    localStorage.removeItem('agentEmail');
    localStorage.removeItem('agentPhone');
    navigate('/login');
  };
  return (
    <aside className="w-60 bg-blue-900 text-white flex flex-col justify-between p-4">
      <div>
        <div  className="flex items-center gap-3 mb-6 p-2 rounded-lg hover:bg-blue-800 transition-colors">
          <img src={logo} alt="ScoutTalent logo" className="w-9 h-9 rounded-full object-cover"/>
          <span className="text-lg font-semibold tracking-wide">ScoutTalent</span>
        </div>
        <nav className="space-y-4">
          <Link to="/Scoutmar">
            <div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
              <Home size={20} />
              <span>Dashboard</span>
            </div>
          </Link>
          <br />
          <Link to="/Records">
            <div className="flex items-center gap-3 hover:text-blue-300 cursor-pointer">
              <FileText size={20} />
              <span>Records</span>
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
      <div className="space-y-5 mb-10">
        <div
          className="flex items-center gap-3 cursor-pointer hover:text-blue-300"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
