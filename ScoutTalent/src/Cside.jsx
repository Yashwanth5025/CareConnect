import logo from "/logo.png";
import {Link} from "react-router-dom";
import {ArrowLeft} from "lucide-react"
function Cside({ chats, selectedChat, onSelect, searchValue, onSearchChange, onSearchStartChat }) {
  const role = (typeof window !== 'undefined' && window.localStorage)
    ? (localStorage.getItem('role') || '')
    : '';
  const profilePath = role === 'Player' ? '/player' : role === 'Agent' ? '/Agent' : '/Sprofile';
  return (
    
    <div className="bg-[#122447] text-white w-72 max-w-[40vw] h-full flex flex-col p-2 overflow-hidden shrink-0">
      <div className="flex items-center gap-2">
        <img src={logo} alt="" className="w-10 h-10 rounded-full"/>
        <p>ScoutTalent</p>
      </div>
      <div className="p-3 text-lg font-semibold flex items-center gap-2">
        <Link to={profilePath} className=" rounded-full text-white  ">
              <ArrowLeft className="w-5 h-5" />
        </Link>
        <p>Chats</p></div>
      <input
        className="w-4/5 p-2 rounded-lg border-none mx-auto mb-3 text-black bg-white"
        placeholder="Search..."
        value={searchValue || ""}
        onChange={(e) => onSearchChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearchStartChat?.();
          }
        }}
      />
      <div className="mt-2 space-y-2 overflow-y-auto min-h-0 pr-1">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelect(chat.name)}
            className={`px-4 py-3 cursor-pointer rounded-lg ${
              selectedChat === chat.name ? "bg-[#19325F]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span className="font-medium truncate">{chat.name}</span>
                  {chat.online && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
                </div>
                <p className="text-xs text-slate-300 truncate mt-1">
                  {chat.typing ? "typing..." : (chat.lastMessage || "Start chatting")}
                </p>
              </div>
              <div className="text-right shrink-0">
                {chat.lastMessageAt && (
                  <div className="text-[10px] text-slate-300">
                    {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {chat.unreadCount > 0 && (
                  <div className="mt-1 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full inline-block">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cside;
