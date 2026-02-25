import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Users, Play, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import lobbyAudio from "../audio/lobby.mp3";

export default function HostLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Attempt to rejoin if we refreshed
    socket.emit("rejoin_host", { pin }, (res: any) => {
      if (res.success) {
        setPlayers(res.game.players);
      }
    });

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

  useEffect(() => {
    const audio = new Audio(lobbyAudio);
    audio.loop = true;
    audio.volume = 0.5;
    
    // Attempt to play, catch autoplay restrictions
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log("Autoplay prevented. User interaction needed.", error);
      });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const joinUrl = `${window.location.origin}/?pin=${pin}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-6 md:p-12 text-center max-w-4xl w-full"
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-gray-500 mb-4 uppercase tracking-widest">
              Join at www.kahoot.it with Game PIN:
            </h2>
            <div className="text-6xl md:text-8xl font-black text-indigo-600 mb-6 tracking-tighter">
              {pin}
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-full transition-colors"
            >
              {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-3 text-xl md:text-2xl font-bold text-gray-700 bg-gray-100 px-6 py-3 rounded-2xl w-full sm:w-auto justify-center">
            <Users size={32} className="text-indigo-600" />
            {players.length} Players
          </div>
          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className="bg-green-500 text-white px-10 py-4 rounded-2xl font-black text-xl md:text-2xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Play size={32} />
            Start Game
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
          <AnimatePresence mode="popLayout">
            {players.map((player) => (
              <motion.div
                layout
                key={player.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="bg-indigo-50 text-indigo-900 font-bold text-lg md:text-xl py-3 px-4 md:px-6 rounded-xl truncate shadow-sm border border-indigo-100"
              >
                {player.name}
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="col-span-full text-gray-400 font-medium text-lg italic py-8">
              Waiting for players to join...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
