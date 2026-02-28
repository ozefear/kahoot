import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, X, Trophy, Flame, Medal } from "lucide-react";
import { SHAPES } from "../components/Shapes";
import { motion } from "motion/react";

type Question = {
  title: string;
  image?: string;
  options: string[];
  timeLimit: number;
};

export default function PlayerGame() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;

  const [question, setQuestion] = useState<Question | null>(location.state?.initialQuestion || null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    correctOptionIndex: number;
    score: number;
    pointsEarned: number;
    streak: number;
    rank?: number;
    totalPlayers?: number;
  } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalRank, setFinalRank] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
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
          const player = res.player;
          setTotalPlayers(game.players.length);

          if (game.status === "finished") {
            setGameOver(true);
            if (res.leaderboard) {
              const myEntry = res.leaderboard.find((p: any) => p.name === storedName);
              setFinalRank(myEntry?.rank || 0);
              setFinalScore(myEntry ? myEntry.score : player?.score || 0);
            } else {
              setFinalScore(player?.score || 0);
            }
            return;
          }

          setQuestion(game.questions[game.currentQuestionIndex]);
          if (player.currentAnswerIndex !== undefined) setAnswered(true);
          if (game.status === "leaderboard" && player.lastResult) setResult(player.lastResult);
        } else if (!name) {
          navigate("/");
        }
      });
    };

    performRejoin();

    const onConnect = () => performRejoin();

    const onNewQuestion = (data: any) => {
      setQuestion(data.question);
      setAnswered(false);
      setResult(null);
    };

    const onQuestionResult = (data: any) => {
      setResult(data);
      setTotalPlayers(data.totalPlayers || 0);
    };

    const onGameOver = (data: any) => {
      setGameOver(true);
      const myEntry = data.leaderboard.find((p: any) => p.name === storedName);
      setFinalRank(myEntry?.rank || 0);
      setFinalScore(myEntry ? myEntry.score : 0);
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
    socket.on("question_result", onQuestionResult);
    socket.on("game_over", onGameOver);
    socket.on("host_disconnected", onHostDisconnected);
    socket.on("host_reconnected", onHostReconnected);
    socket.on("you_are_kicked", onKicked);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_question", onNewQuestion);
      socket.off("question_result", onQuestionResult);
      socket.off("game_over", onGameOver);
      socket.off("host_disconnected", onHostDisconnected);
      socket.off("host_reconnected", onHostReconnected);
      socket.off("you_are_kicked", onKicked);
    };
  }, [name, navigate, pin]);

  const handleAnswer = (index: number) => {
    if (answered) return;
    setAnswered(true);
    socket.emit("player_answer", { pin, answerIndex: index });
  };

  const rankLabel = (rank: number) => {
    if (rank === 1) return "🥇 1. sıradasın!";
    if (rank === 2) return "🥈 2. sıradasın!";
    if (rank === 3) return "🥉 3. sıradasın!";
    return `${rank}. sıradasın`;
  };

  if (gameOver) {
    const podiumColors = ["text-yellow-400", "text-gray-300", "text-orange-400"];
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-[var(--text-primary)] selection:bg-purple-500/30">
        <Trophy size={80} className="text-yellow-400 mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        <h1 className="text-4xl md:text-6xl font-black mb-4">Yarışma Bitti!</h1>
        <div className="text-2xl md:text-3xl font-bold mb-8 text-purple-600 dark:text-purple-400">
          {name || sessionStorage.getItem("playerName")}
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl p-6 md:p-8 text-center shadow-2xl w-full max-w-sm"
        >
          <div className="text-xl md:text-2xl font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Final Skoru</div>
          <div className="text-5xl md:text-6xl font-black mb-6 text-purple-600 dark:text-purple-400">{finalScore}</div>
          {finalRank > 0 && (
            <div className={`text-2xl md:text-3xl font-bold ${finalRank <= 3 ? podiumColors[finalRank - 1] : "text-[var(--text-secondary)]"}`}>
              {rankLabel(finalRank)}
            </div>
          )}
          {totalPlayers > 0 && (
            <div className="text-sm text-[var(--text-secondary)] mt-2">{totalPlayers} oyuncu arasında</div>
          )}
        </motion.div>
        <button
          onClick={() => navigate("/")}
          className="mt-12 bg-purple-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-purple-700 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          Tekrar Oyna
        </button>
      </div>
    );
  }

  const disconnectedOverlay = isHostDisconnected ? (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-quiz-card)] p-8 border border-[var(--border-color)] rounded-3xl text-center shadow-2xl animate-pulse">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">Sunucu Bağlantısı Koptu</h2>
        <p className="text-[var(--text-secondary)]">Sunucunun yeniden bağlanması bekleniyor...</p>
      </div>
    </div>
  ) : null;

  if (result) {
    return (
      <div className={`min-h-screen bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-white ${result.correct ? "bg-green-600" : "bg-red-600"}`}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          {result.correct ? (
            <Check size={100} className="mb-6 md:mb-8 drop-shadow-lg" />
          ) : (
            <X size={100} className="mb-6 md:mb-8 drop-shadow-lg" />
          )}
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black mb-4 drop-shadow-md">
          {result.correct ? "Doğru!" : "Yanlış"}
        </h1>

        {result.streak >= 3 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-2 bg-orange-500/30 text-white px-6 py-2 rounded-full font-bold text-xl md:text-2xl mb-4 border border-orange-400/50 backdrop-blur-sm"
          >
            <Flame className="text-orange-300" /> {result.streak}'li Seri!
          </motion.div>
        )}

        <div className="bg-black/30 backdrop-blur-md rounded-3xl p-6 md:p-8 text-center mt-4 md:mt-8 w-full max-w-sm border border-white/10">
          <div className="text-xl md:text-2xl font-bold text-white/80 uppercase tracking-widest mb-2">Puan</div>
          <div className="text-5xl md:text-6xl font-black">+{result.pointsEarned}</div>
          <div className="text-lg text-white/70 mt-2">Toplam: {result.score}</div>
        </div>

        {/* Player rank after question */}
        {result.rank && result.rank > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full font-bold text-lg border border-white/30"
          >
            <Medal size={20} />
            {rankLabel(result.rank)}
            {result.totalPlayers && result.totalPlayers > 0 && (
              <span className="text-white/70 font-normal">/ {result.totalPlayers}</span>
            )}
          </motion.div>
        )}

        <div className="mt-10 text-lg md:text-xl font-bold animate-pulse text-white/80">
          Sunucu bekleniyor...
        </div>
        {disconnectedOverlay}
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex items-center justify-center text-[var(--text-primary)] text-2xl md:text-4xl font-bold">
        Yükleniyor...
        {disconnectedOverlay}
      </div>
    );
  }

  if (answered) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-[var(--text-primary)]">
        <div className="w-16 h-16 md:w-24 md:h-24 border-8 border-purple-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h1 className="text-2xl md:text-4xl font-black text-center text-[var(--text-secondary)]">Diğerleri bekleniyor...</h1>
        {disconnectedOverlay}
      </div>
    );
  }

  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
  const shadowColors = ["shadow-red-500/50", "shadow-blue-500/50", "shadow-yellow-500/50", "shadow-green-500/50"];

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col p-4 md:p-6">
      {/* Question title shown on player's phone */}
      {question.title && (
        <div className="mb-4 text-center font-bold text-xl md:text-2xl text-[var(--text-primary)] leading-snug px-2">
          {question.title}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 flex-1">
        {question.options.map((_, index) => {
          const Shape = SHAPES[index];
          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className={`${colors[index]} rounded-3xl shadow-lg hover:${shadowColors[index]} active:scale-95 transition-all flex items-center justify-center h-full min-h-[120px] border border-white/20`}
            >
              <Shape className="w-1/3 h-1/3 text-white drop-shadow-md" />
            </button>
          );
        })}
      </div>
      {disconnectedOverlay}
    </div>
  );
}
