import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Home() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !name) return;

    socket.emit("player_join", { pin, name }, (response: any) => {
      if (response.error) {
        setError(response.error);
      } else {
        navigate(`/player/lobby/${pin}`, { state: { name } });
      }
    });
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-black text-center text-indigo-600 mb-8 tracking-tighter">
          Kahoot Clone
        </h1>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Game PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-2xl font-bold p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none"
              maxLength={6}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-center text-xl font-bold p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none"
              maxLength={15}
            />
          </div>
          
          {error && <p className="text-red-500 text-center font-medium">{error}</p>}
          
          <button
            type="submit"
            disabled={!pin || !name}
            className="w-full bg-black text-white font-bold text-xl p-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enter
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <p className="text-gray-500 mb-4">Want to host a game?</p>
          <button
            onClick={() => navigate("/host/create")}
            className="text-indigo-600 font-bold hover:text-indigo-800"
          >
            Create Game
          </button>
        </div>
      </div>
    </div>
  );
}
