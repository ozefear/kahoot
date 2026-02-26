import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Users, Play, Copy, Check, Volume2, VolumeX, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import lobbyAudio from "../audio/lobby.mp3";

export default function HostLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audio] = useState(() => {
    const a = new Audio(lobbyAudio);
    a.loop = true;
    a.volume = 0.5;
    return a;
  });

  useEffect(() => {
    // Attempt to rejoin if we refreshed
    socket.emit("rejoin_host", { pin }, (res: any) => {
      if (res.success) {
        setPlayers(res.game.players);
      }
    });

    socket.on("player_joined", (player) => {
      setPlayers((prev) => {
        if (prev.find(p => p.name === player.name)) return prev;
        return [...prev, player];
      });
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
    if (audioEnabled) {
      audio.play().catch(e => console.log(e));
    } else {
      audio.pause();
    }
    return () => {
      audio.pause();
    };
  }, [audioEnabled, audio]);

  const joinUrl = `${window.location.origin}/?pin=${pin}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pinDigits = pin ? pin.split("") : [];

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-2xl font-bold tracking-tight">ACM Hacettepe</span>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium"
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-red-400" />}
            Sesi {audioEnabled ? "Kapat" : "Aç"}
          </button>
          <div className="w-px h-8 bg-white/10 mx-2"></div>
          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            Oyunu Başlat
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-16 px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-white">Şuradan katılın: </span>
              <span className="text-blue-400">{window.location.host}</span>
            </h1>
            <p className="text-gray-400 font-bold tracking-[0.2em] text-sm uppercase mb-6">
              6 Haneli PIN'i Girin
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 mx-auto bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-colors font-bold"
            >
              {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
              {copied ? "Kopyalandı!" : "Bağlantıyı Kopyala"}
            </button>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 rounded-2xl shadow-2xl"
          >
            <QRCodeSVG value={joinUrl} size={160} />
          </motion.div>
        </div>

        {/* PIN Display */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 mb-16 shadow-2xl backdrop-blur-sm">
          <div className="flex gap-3 md:gap-6 justify-center">
            {pinDigits.map((digit, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className="w-16 h-24 md:w-24 md:h-32 bg-[var(--color-quiz-card)] rounded-2xl flex items-center justify-center text-5xl md:text-7xl font-black shadow-inner border border-white/5"
              >
                {digit}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Players Count */}
        <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-500/30 px-6 py-2.5 rounded-full mb-12">
          <Users size={20} className="text-blue-400" />
          <span className="font-bold text-blue-200 tracking-wider text-sm">
            {players.length} OYUNCU KATILDI
          </span>
        </div>

        {/* Players Grid */}
        <div className="w-full max-w-5xl flex flex-wrap justify-center gap-4 pb-12">
          <AnimatePresence mode="popLayout">
            {players.map((player) => (
              <motion.div
                layout
                key={player.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="bg-[var(--color-quiz-card)] border border-white/10 text-gray-200 font-semibold py-3 px-8 rounded-full shadow-sm hover:bg-white/5 transition-colors"
              >
                {player.name}
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="text-gray-500 font-medium italic py-8">
              Oyuncuların katılması bekleniyor...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
