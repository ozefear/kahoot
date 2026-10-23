import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Users, Copy, Check, Volume2, VolumeX, Sparkles, UserX, Crown, Palette, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { THEME_LIST, applyTheme, getTheme } from "../themes";

const LOBBY_AUDIO = "/audio/lobby.mp3";

export default function HostLobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [hostNickname, setHostNickname] = useState(sessionStorage.getItem("hostNickname") || "Admin");
  const [copied, setCopied] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState(sessionStorage.getItem("setTitle") || "Hacettepe Kahoot");
  const [theme, setTheme] = useState(() => sessionStorage.getItem("selectedTheme") || "sitcom");
  const [showThemeModal, setShowThemeModal] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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
          if (res.game?.title) {
            setRoomTitle(res.game.title);
          }
          if (res.theme) {
            setTheme(res.theme);
            sessionStorage.setItem("selectedTheme", res.theme);
            applyTheme(res.theme);
          }
          if (res.hostNickname) {
            setHostNickname(res.hostNickname);
            sessionStorage.setItem("hostNickname", res.hostNickname);
          }
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

    const onThemeUpdated = (data: any) => {
      if (data?.theme) {
        setTheme(data.theme);
        sessionStorage.setItem("selectedTheme", data.theme);
        applyTheme(data.theme);
      }
    };

    socket.on("connect", onConnect);
    socket.on("player_joined", onPlayerJoined);
    socket.on("player_left", onPlayerLeft);
    socket.on("theme_updated", onThemeUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("player_joined", onPlayerJoined);
      socket.off("player_left", onPlayerLeft);
      socket.off("theme_updated", onThemeUpdated);
    };
  }, [pin]);

  const handleStartGame = () => {
    sessionStorage.setItem("hostTheme", theme);
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
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center border border-purple-400/40 shadow-sm">
            <span className="text-xl">🎯</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">Hacettepe Kahoot</span>
            </div>
            {roomTitle && (
              <span className="text-xs font-bold text-purple-300 truncate max-w-xs">{roomTitle}</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/40 px-3.5 py-1 rounded-full text-yellow-300 font-bold text-xs shadow-sm ml-2">
            <Crown size={14} className="text-yellow-400" />
            <span>Yönetici: <strong className="text-white font-extrabold">{hostNickname}</strong></span>
          </div>
          <button
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-1.5 bg-white/10 border border-white/20 hover:border-purple-400/60 px-3.5 py-1 rounded-full text-xs font-bold text-white hover:bg-white/15 transition-all shadow-sm ml-1 cursor-pointer"
            title="Temayı Değiştir"
          >
            <Palette size={14} className="text-purple-300" />
            <span>{getTheme(theme).badge} {getTheme(theme).name}</span>
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors font-bold text-sm cursor-pointer"
          >
            {audioEnabled ? <Volume2 size={20} className="text-green-400" /> : <VolumeX size={20} className="text-red-400" />}
            <span>Sesi {audioEnabled ? "Kapat" : "Aç"}</span>
          </button>
          <div className="w-px h-8 bg-white/20 mx-2"></div>
          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-2.5 rounded-full font-black text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] cursor-pointer"
          >
            Yarışmayı Başlat
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-16 px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-3">
              <span className="text-white">Şuradan katılın: </span>
              <span className="text-purple-300 font-black tracking-wide drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]">{window.location.host}</span>
            </h1>
            <p className="text-slate-300 font-extrabold tracking-[0.2em] text-sm uppercase mb-6 drop-shadow-sm">6 Haneli PIN'i Girin</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 mx-auto bg-white/10 hover:bg-white/20 active:bg-white/25 text-white px-7 py-3 rounded-full transition-all font-black text-base border border-white/25 shadow-lg backdrop-blur-md cursor-pointer"
            >
              {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-purple-300" />}
              <span>{copied ? "Kopyalandı!" : "Bağlantıyı Kopyala"}</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-white/25"
          >
            <QRCodeSVG value={joinUrl} size={160} />
          </motion.div>
        </div>

        {/* Room Title & PIN Display */}
        {roomTitle && (
          <div className="mb-6 text-center">
            <span className="text-xs uppercase tracking-widest font-black text-slate-300 block mb-1">Oda / Yarışma</span>
            <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {roomTitle}
            </h2>
          </div>
        )}

        <div className="bg-[var(--color-quiz-card)] border-2 border-white/20 rounded-3xl p-8 md:p-12 mb-14 shadow-2xl backdrop-blur-md">
          <div className="flex gap-3 md:gap-6 justify-center">
            {pinDigits.map((digit, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className="w-16 h-24 md:w-24 md:h-32 bg-white/10 rounded-2xl flex items-center justify-center text-5xl md:text-7xl font-black shadow-inner border-2 border-white/25 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] select-all"
              >
                {digit}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Players Count */}
        <div className="flex items-center gap-3 bg-purple-500/20 border border-purple-400/40 px-6 py-2.5 rounded-full mb-10 shadow-sm">
          <Users size={20} className="text-purple-300" />
          <span className="font-black text-purple-200 tracking-wider text-sm md:text-base">
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
                className="group relative bg-white/10 border-2 border-white/20 text-white font-extrabold text-base md:text-lg py-3.5 px-8 rounded-full shadow-md hover:border-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                {player.name}
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs items-center justify-center font-bold hidden group-hover:flex">✕</span>
              </motion.button>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="text-slate-300 font-bold text-lg italic py-8">
              Oyuncuların katılması bekleniyor...
            </div>
          )}
        </div>
        {players.length > 0 && (
          <p className="text-slate-300 text-sm mb-8 -mt-6 font-semibold">Bir oyuncuya tıklayarak oyundan atabilirsiniz</p>
        )}
      </main>

      {/* Theme Switcher Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Palette className="w-6 h-6 text-purple-500" />
                <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">Oda Teması Değiştir</h2>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 font-medium">
              Seçtiğiniz tema şu anda lobideki ve oyuna katılacak tüm oyuncuların ekranına anında yansıtılacaktır.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {THEME_LIST.map((th) => {
                const isSelected = theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => {
                      setTheme(th.id);
                      sessionStorage.setItem("selectedTheme", th.id);
                      applyTheme(th.id);
                      socket.emit("host_update_theme", { pin, theme: th.id });
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 cursor-pointer ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/20"
                        : "border-[var(--border-color)] bg-[var(--input-bg)] hover:bg-[var(--input-focus)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>{th.badge}</span>
                        <span>{th.name}</span>
                      </span>
                      {isSelected && <Check size={16} className="text-purple-500 flex-shrink-0" />}
                    </div>
                    {/* Swatches */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {th.previewColors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-5 h-5 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowThemeModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
