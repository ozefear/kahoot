import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Users, Play } from "lucide-react";

export default function HostLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    socket.on("player_joined", (player) => {
      setPlayers((prev) => [...prev, player]);
    });

    socket.on("player_left", ({ playerId }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    return () => {
      socket.off("player_joined");
      socket.off("player_left");
    };
  }, []);

  const handleStartGame = () => {
    socket.emit("host_start_game", { pin });
    navigate(`/host/game/${pin}`);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-3xl w-full">
        <h2 className="text-2xl font-bold text-gray-500 mb-4 uppercase tracking-widest">
          Join at www.kahoot.it with Game PIN:
        </h2>
        <div className="text-8xl font-black text-indigo-600 mb-12 tracking-tighter">
          {pin}
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3 text-2xl font-bold text-gray-700 bg-gray-100 px-6 py-3 rounded-2xl">
            <Users size={32} className="text-indigo-600" />
            {players.length} Players
          </div>
          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className="bg-green-500 text-white px-10 py-4 rounded-2xl font-black text-2xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            <Play size={32} />
            Start Game
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-indigo-50 text-indigo-900 font-bold text-xl py-3 px-6 rounded-xl truncate shadow-sm border border-indigo-100"
            >
              {player.name}
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full text-gray-400 font-medium text-lg italic py-8">
              Waiting for players to join...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
