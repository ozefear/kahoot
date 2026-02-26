import { useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function PlayerLobby() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;

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

    // Rejoin if refreshed
    socket.emit("rejoin_player", { pin: storedPin, name: storedName }, (res: any) => {
      if (!res.success && !name) {
        navigate("/");
      }
    });

    socket.on("new_question", (data) => {
      navigate(`/player/game/${storedPin}`, { state: { name: storedName, initialQuestion: data.question } });
    });

    socket.on("host_disconnected", () => {
      alert("Sunucu ayrıldı.");
      navigate("/");
    });

    return () => {
      socket.off("new_question");
      socket.off("host_disconnected");
    };
  }, [name, navigate, pin]);

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-[var(--text-primary)] text-center selection:bg-purple-500/30">
      <div className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 tracking-tight text-[var(--text-secondary)]">Katıldın!</div>
      <div className="text-5xl md:text-6xl font-black mb-8 md:mb-12 text-purple-600 dark:text-purple-400 break-words max-w-full px-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">{name}</div>
      <div className="text-xl md:text-2xl font-bold text-[var(--text-secondary)] animate-pulse">
        Ekranda adını gör
      </div>
    </div>
  );
}
