import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, X, Trophy, Flame } from "lucide-react";
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
  } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [rank, setRank] = useState(0);

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

    // Attempt to rejoin if we refreshed
    socket.emit("rejoin_player", { pin: storedPin, name: storedName }, (res: any) => {
      if (res.success) {
        const game = res.game;
        const player = res.player;
        setQuestion(game.questions[game.currentQuestionIndex]);
        if (player.currentAnswerIndex !== undefined) {
          setAnswered(true);
        }
        if (game.status === "leaderboard" && player.lastResult) {
          setResult(player.lastResult);
        }
      } else if (!name) {
        navigate("/");
      }
    });

    socket.on("new_question", (data) => {
      setQuestion(data.question);
      setAnswered(false);
      setResult(null);
    });

    socket.on("question_result", (data) => {
      setResult(data);
    });

    socket.on("game_over", (data) => {
      setGameOver(true);
      const myRank = data.leaderboard.findIndex((p: any) => p.name === name) + 1;
      setRank(myRank);
      const me = data.leaderboard.find((p: any) => p.name === name);
      setFinalScore(me ? me.score : result?.score || 0);
    });

    socket.on("host_disconnected", () => {
      alert("Kurucu oyundan ayrıldı.");
      navigate("/");
    });

    return () => {
      socket.off("new_question");
      socket.off("question_result");
      socket.off("game_over");
      socket.off("host_disconnected");
    };
  }, [name, navigate, result?.score]);

  const handleAnswer = (index: number) => {
    if (answered) return;
    setAnswered(true);
    socket.emit("player_answer", { pin, answerIndex: index });
  };

  if (gameOver) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-white selection:bg-violet-500/30">
        <Trophy size={80} className="text-yellow-400 mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        <h1 className="text-4xl md:text-6xl font-black mb-4">Oyun Bitti!</h1>
        <div className="text-2xl md:text-3xl font-bold mb-8 text-violet-300">{name}</div>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--color-quiz-card)] border border-white/10 text-white rounded-3xl p-6 md:p-8 text-center shadow-2xl w-full max-w-sm"
        >
          <div className="text-xl md:text-2xl font-bold text-gray-400 uppercase tracking-widest mb-2">Final Skoru</div>
          <div className="text-5xl md:text-6xl font-black mb-8 text-violet-400">{finalScore}</div>
          {rank > 0 && rank <= 3 && (
            <div className="text-2xl md:text-3xl font-bold text-green-400">{rank}. oldun!</div>
          )}
        </motion.div>
        <button
          onClick={() => navigate("/")}
          className="mt-12 bg-violet-500 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-violet-600 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        >
          Tekrar Oyna
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div
        className={`min-h-screen bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-white ${
          result.correct ? "bg-green-600" : "bg-red-600"
        }`}
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          {result.correct ? (
            <Check size={100} className="mb-6 md:mb-8 md:w-32 md:h-32 drop-shadow-lg" />
          ) : (
            <X size={100} className="mb-6 md:mb-8 md:w-32 md:h-32 drop-shadow-lg" />
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
            <Flame className="text-orange-300" /> {result.streak} Seri!
          </motion.div>
        )}

        <div className="bg-black/30 backdrop-blur-md rounded-3xl p-6 md:p-8 text-center mt-4 md:mt-8 w-full max-w-sm border border-white/10">
          <div className="text-xl md:text-2xl font-bold text-white/80 uppercase tracking-widest mb-2">Puan</div>
          <div className="text-5xl md:text-6xl font-black">+{result.pointsEarned}</div>
        </div>
        <div className="mt-8 md:mt-12 text-xl md:text-2xl font-bold text-white/90 drop-shadow-md">
          Toplam Puan: {result.score}
        </div>
        <div className="mt-12 md:mt-16 text-lg md:text-xl font-bold animate-pulse text-white/80">
          Kurucu bekleniyor...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex items-center justify-center text-white text-2xl md:text-4xl font-bold">
        Yükleniyor...
      </div>
    );
  }

  if (answered) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-white">
        <div className="w-16 h-16 md:w-24 md:h-24 border-8 border-violet-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h1 className="text-2xl md:text-4xl font-black text-center text-gray-200">Diğerleri bekleniyor...</h1>
      </div>
    );
  }

  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
  const shadowColors = ["shadow-red-500/50", "shadow-blue-500/50", "shadow-yellow-500/50", "shadow-green-500/50"];

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 flex-1">
        {question.options.map((_, index) => {
          const Shape = SHAPES[index];
          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className={`${colors[index]} rounded-3xl shadow-lg hover:${shadowColors[index]} active:scale-95 transition-all flex items-center justify-center h-full min-h-[150px] border border-white/20`}
            >
              <Shape className="w-1/3 h-1/3 text-white drop-shadow-md" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
