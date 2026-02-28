import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Users, Copy, Check, Volume2, VolumeX, Sparkles, UserX } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";

const LOBBY_AUDIO = "/audio/lobby.mp3";

export default function HostLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);

  const [audio] = useState(() => {
    const a = new Audio(LOBBY_AUDIO);
    a.loop = true;
    a.volume = 0.5;
    return a;
  });

  useEffect(() => {
    const performRejoin = () => {
      socket.emit("rejoin_host", { pin }, (res: any) => {
        if (res.success) {
          setPlayers(res.game.players);
        }
      });
    };

    performRejoin();

    const onConnect = () => performRejoin();

    const onPlayerJoined = (player: any) => {
      setPlayers((prev) => {
        if (prev.find(p => p.name === player.name)) return prev;
        return [...prev, player];
      });
    };

    const onPlayerLeft = ({ playerId }: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    };

    socket.on("connect", onConnect);
    socket.on("player_joined", onPlayerJoined);
    socket.on("player_left", onPlayerLeft);

    return () => {
      socket.off("connect", onConnect);
      socket.off("player_joined", onPlayerJoined);
      socket.off("player_left", onPlayerLeft);
    };
  }, [pin]);

  const handleStartGame = () => {
    socket.emit("host_start_game", { pin });
    navigate(`/host/game/${pin}`);
  };

  const handleKick = (name: string) => {
    socket.emit("kick_player", { pin, name });
    setPlayers((prev) => prev.filter((p) => p.name !== name));
    setKickingPlayer(null);
  };

  useEffect(() => {
    if (audioEnabled) {
      audio.play().catch(e => console.log(e));
    } else {
      audio.pause();
    }
    return () => { audio.pause(); };
  }, [audioEnabled, audio]);

  const joinUrl = `${window.location.origin}/?pin=${pin}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pinDigits = pin ? pin.split("") : [];

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
      {/* Kick confirmation modal */}
      <AnimatePresence>
        {kickingPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <UserX size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Oyuncuyu At</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                <span className="font-bold text-[var(--text-primary)]">{kickingPlayer}</span> oyundan atılacak.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setKickingPlayer(null)}
                  className="flex-1 py-3 font-bold rounded-2xl bg-[var(--input-bg)] hover:bg-[var(--input-focus)] transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleKick(kickingPlayer)}
                  className="flex-1 py-3 font-bold rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  At
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)] bg-[var(--color-quiz-bg)]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
            <Sparkles className="w-6 h-6 text-purple-500 dark:text-purple-400" />
          </div>
          <span className="text-2xl font-bold tracking-tight">ACM Hacettepe</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-red-500 dark:text-red-400" />}
            Sesi {audioEnabled ? "Kapat" : "Aç"}
          </button>
          <div className="w-px h-8 bg-[var(--border-color)] mx-2"></div>
          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            Yarışmayı Başlat
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-16 px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-[var(--text-primary)]">Şuradan katılın: </span>
              <span className="text-purple-600 dark:text-purple-400">{window.location.host}</span>
            </h1>
            <p className="text-[var(--text-secondary)] font-bold tracking-[0.2em] text-sm uppercase mb-6">6 Haneli PIN'i Girin</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 mx-auto bg-[var(--input-bg)] hover:bg-[var(--input-focus)] px-6 py-3 rounded-full transition-colors font-bold border border-[var(--border-color)]"
            >
              {copied ? <Check size={20} className="text-green-500 dark:text-green-400" /> : <Copy size={20} />}
              {copied ? "Kopyalandı!" : "Bağlantıyı Kopyala"}
            </button>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 rounded-2xl shadow-2xl border border-[var(--border-color)]"
          >
            <QRCodeSVG value={joinUrl} size={160} />
          </motion.div>
        </div>

        {/* PIN Display */}
        <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-8 md:p-12 mb-16 shadow-2xl">
          <div className="flex gap-3 md:gap-6 justify-center">
            {pinDigits.map((digit, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className="w-16 h-24 md:w-24 md:h-32 bg-[var(--input-bg)] rounded-2xl flex items-center justify-center text-5xl md:text-7xl font-black shadow-inner border border-[var(--border-color)] text-[var(--text-primary)]"
              >
                {digit}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Players Count */}
        <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 px-6 py-2.5 rounded-full mb-12">
          <Users size={20} className="text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-purple-700 dark:text-purple-300 tracking-wider text-sm">
            {players.length} OYUNCU KATILDI
          </span>
        </div>

        {/* Players Grid — clickable to kick */}
        <div className="w-full max-w-5xl flex flex-wrap justify-center gap-4 pb-12">
          <AnimatePresence mode="popLayout">
            {players.map((player) => (
              <motion.button
                layout
                key={player.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3 }}
                onClick={() => setKickingPlayer(player.name)}
                className="group relative bg-[var(--color-quiz-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold py-3 px-8 rounded-full shadow-sm hover:border-red-500/50 hover:bg-red-500/5 transition-all"
              >
                {player.name}
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs items-center justify-center font-bold hidden group-hover:flex">✕</span>
              </motion.button>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="text-[var(--text-secondary)] font-medium italic py-8">
              Oyuncuların katılması bekleniyor...
            </div>
          )}
        </div>
        {players.length > 0 && (
          <p className="text-[var(--text-secondary)] text-sm mb-8 -mt-8">Bir oyuncuya tıklayarak oyundan atabilirsiniz</p>
        )}
      </main>
    </div>
  );
}
