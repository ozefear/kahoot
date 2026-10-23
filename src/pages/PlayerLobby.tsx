import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Crown, Users, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { applyTheme } from "../themes";

export default function PlayerLobby() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;

  const [isHostDisconnected, setIsHostDisconnected] = useState(false);
  const [adminName, setAdminName] = useState(location.state?.hostNickname || "Admin");
  const [roomTitle, setRoomTitle] = useState(location.state?.title || "Yarışma");
  const [theme, setTheme] = useState(location.state?.theme || "sitcom");
  const [players, setPlayers] = useState<{ id: string; name: string }[]>(location.state?.players || []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const storedName = name || sessionStorage.getItem("playerName");
    const storedPin = pin || sessionStorage.getItem("gamePin");

    if (!storedName || !storedPin) {
      navigate("/");
      return;
    }

    if (name && pin) {
      sessionStorage.setItem("playerName", name);
      sessionStorage.setItem("gamePin", pin);
    }

    const performRejoin = () => {
      socket.emit("rejoin_player", { pin: storedPin, name: storedName }, (res: any) => {
        if (res.success) {
          const game = res.game;
          if (res.hostNickname) setAdminName(res.hostNickname);
          if (res.title) setRoomTitle(res.title);
          if (res.players) setPlayers(res.players);
          if (res.theme) {
            setTheme(res.theme);
            applyTheme(res.theme);
          }

          if (game.status !== "lobby") {
            navigate(`/player/game/${storedPin}`, {
              state: {
                name: storedName,
                hostNickname: res.hostNickname || adminName,
                questionIndex: res.questionIndex,
                totalQuestions: res.totalQuestions,
                theme: res.theme || theme,
              },
            });
          }
        } else if (!name) {
          navigate("/");
        }
      });
    };

    performRejoin();

    const onConnect = () => performRejoin();

    const onNewQuestion = (data: any) => {
      const activeTheme = data.theme || theme;
      applyTheme(activeTheme);
      navigate(`/player/game/${storedPin}`, {
        state: {
          name: storedName,
          initialQuestion: data.question,
          questionIndex: data.questionIndex ?? 0,
          totalQuestions: data.totalQuestions ?? 0,
          hostNickname: adminName,
          theme: activeTheme,
        },
      });
    };

    const onLobbyPlayersUpdated = (data: any) => {
      if (data.players) setPlayers(data.players);
      if (data.hostNickname) setAdminName(data.hostNickname);
      if (data.title) setRoomTitle(data.title);
      if (data.theme) {
        setTheme(data.theme);
        applyTheme(data.theme);
      }
    };

    const onThemeUpdated = (data: any) => {
      if (data.theme) {
        setTheme(data.theme);
        applyTheme(data.theme);
      }
    };

    const onHostDisconnected = () => setIsHostDisconnected(true);
    const onHostReconnected = () => setIsHostDisconnected(false);
    const onKicked = () => {
      sessionStorage.removeItem("playerName");
      sessionStorage.removeItem("gamePin");
      navigate("/", { state: { kicked: true } });
    };

    socket.on("connect", onConnect);
    socket.on("new_question", onNewQuestion);
    socket.on("lobby_players_updated", onLobbyPlayersUpdated);
    socket.on("theme_updated", onThemeUpdated);
    socket.on("host_disconnected", onHostDisconnected);
    socket.on("host_reconnected", onHostReconnected);
    socket.on("you_are_kicked", onKicked);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_question", onNewQuestion);
      socket.off("lobby_players_updated", onLobbyPlayersUpdated);
      socket.off("theme_updated", onThemeUpdated);
      socket.off("host_disconnected", onHostDisconnected);
      socket.off("host_reconnected", onHostReconnected);
      socket.off("you_are_kicked", onKicked);
    };
  }, [name, navigate, pin, adminName, theme]);

  const storedPlayerName = name || sessionStorage.getItem("playerName") || "";

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--color-quiz-bg)]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">Hacettepe Kahoot</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
          <span className="text-slate-300 font-extrabold">PIN:</span>
          <span className="text-purple-300 font-black tracking-wider text-sm">{pin}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-2xl mx-auto w-full">
        {/* Admin Badge */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/40 px-5 py-2.5 rounded-full text-yellow-300 font-bold text-sm mb-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
        >
          <Crown size={18} className="text-yellow-400 animate-pulse" />
          <span>Oda Yöneticisi (Admin): <strong className="text-white font-black">{adminName}</strong></span>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-center mb-6 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          {roomTitle}
        </h1>

        {/* Player Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full bg-[var(--color-quiz-card)] border-2 border-white/20 rounded-3xl p-6 md:p-8 text-center shadow-2xl mb-8 relative overflow-hidden backdrop-blur-md"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"></div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-300 mb-2">
            Katıldınız
          </div>
          <div className="text-4xl md:text-6xl font-black text-white mb-6 break-words drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">
            {storedPlayerName}
          </div>

          <div className="inline-flex items-center gap-2.5 bg-purple-500/20 border border-purple-400/40 px-6 py-2.5 rounded-full text-purple-200 font-bold text-sm md:text-base animate-pulse shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></span>
            Yöneticinin yarışmayı başlatması bekleniyor...
          </div>
        </motion.div>

        {/* Players List in Lobby */}
        {players.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-sm font-black text-slate-300 uppercase tracking-wider">
                <Users size={16} className="text-purple-300" />
                <span>Lobideki Oyuncular ({players.length})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 justify-center">
              <AnimatePresence>
                {players.map((p) => {
                  const isMe = p.name === storedPlayerName;
                  return (
                    <motion.div
                      layout
                      key={p.id || p.name}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className={`px-4 py-2 rounded-full text-sm font-extrabold border transition-all ${
                        isMe
                          ? "bg-purple-600 text-white border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                          : "bg-white/10 border-2 border-white/20 text-white shadow-sm"
                      }`}
                    >
                      {p.name} {isMe && <span className="opacity-90 text-xs ml-1 font-black">(Sen)</span>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Disconnect Overlay */}
      {isHostDisconnected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] p-8 border border-[var(--border-color)] rounded-3xl text-center shadow-2xl animate-pulse max-w-sm w-full">
            <AlertCircle size={48} className="text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-orange-400">Sunucu Bağlantısı Koptu</h2>
            <p className="text-[var(--text-secondary)]">Oda yöneticisinin yeniden bağlanması bekleniyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
