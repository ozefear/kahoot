import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function PlayerLobby() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;

  const [isHostDisconnected, setIsHostDisconnected] = useState(false);

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
          if (game.status !== "lobby") {
            navigate(`/player/game/${storedPin}`, { state: { name: storedName } });
          }
        } else if (!name) {
          navigate("/");
        }
      });
    };

    performRejoin();

    const onConnect = () => performRejoin();
    const onNewQuestion = (data: any) => {
      navigate(`/player/game/${storedPin}`, { state: { name: storedName, initialQuestion: data.question } });
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
    socket.on("host_disconnected", onHostDisconnected);
    socket.on("host_reconnected", onHostReconnected);
    socket.on("you_are_kicked", onKicked);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_question", onNewQuestion);
      socket.off("host_disconnected", onHostDisconnected);
      socket.off("host_reconnected", onHostReconnected);
      socket.off("you_are_kicked", onKicked);
    };
  }, [name, navigate, pin]);

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-[var(--text-primary)] text-center selection:bg-purple-500/30">
      <div className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 tracking-tight text-[var(--text-secondary)]">Katıldın!</div>
      <div className="text-5xl md:text-6xl font-black mb-8 md:mb-12 text-purple-600 dark:text-purple-400 break-words max-w-full px-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">{name}</div>
      <div className="text-xl md:text-2xl font-bold text-[var(--text-secondary)] animate-pulse">Ekranda adını gör</div>

      {isHostDisconnected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] p-8 border border-[var(--border-color)] rounded-3xl text-center shadow-2xl animate-pulse">
            <h2 className="text-2xl font-bold mb-4 text-orange-400">Sunucu Bağlantısı Koptu</h2>
            <p className="text-[var(--text-secondary)]">Sunucunun yeniden bağlanması bekleniyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
