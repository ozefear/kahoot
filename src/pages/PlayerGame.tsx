import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, X, Trophy } from "lucide-react";

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
  } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    if (!name) {
      navigate("/");
      return;
    }

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
      alert("Host disconnected.");
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
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-8 text-white">
        <Trophy size={80} className="text-yellow-400 mb-8" />
        <h1 className="text-6xl font-black mb-4">Game Over!</h1>
        <div className="text-3xl font-bold mb-8 text-indigo-200">{name}</div>
        <div className="bg-white text-indigo-900 rounded-3xl p-8 text-center shadow-2xl">
          <div className="text-2xl font-bold text-gray-500 uppercase tracking-widest mb-2">Final Score</div>
          <div className="text-6xl font-black mb-8">{finalScore}</div>
          {rank > 0 && rank <= 3 && (
            <div className="text-3xl font-bold text-green-500">You placed #{rank}!</div>
          )}
        </div>
        <button
          onClick={() => navigate("/")}
          className="mt-12 bg-white/20 text-white px-8 py-3 rounded-xl font-bold text-xl hover:bg-white/30"
        >
          Play Again
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-8 text-white ${
          result.correct ? "bg-green-500" : "bg-red-500"
        }`}
      >
        {result.correct ? (
          <Check size={120} className="mb-8" />
        ) : (
          <X size={120} className="mb-8" />
        )}
        <h1 className="text-6xl font-black mb-4">
          {result.correct ? "Correct!" : "Incorrect"}
        </h1>
        <div className="bg-black/20 rounded-3xl p-8 text-center mt-8">
          <div className="text-2xl font-bold text-white/80 uppercase tracking-widest mb-2">Points</div>
          <div className="text-6xl font-black">+{result.pointsEarned}</div>
        </div>
        <div className="mt-12 text-2xl font-bold text-white/80">
          Total Score: {result.score}
        </div>
        <div className="mt-16 text-xl font-bold animate-pulse">
          Waiting for host...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
        Loading...
      </div>
    );
  }

  if (answered) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-8 text-white">
        <div className="w-24 h-24 border-8 border-white border-t-transparent rounded-full animate-spin mb-8"></div>
        <h1 className="text-4xl font-black">Waiting for others...</h1>
      </div>
    );
  }

  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col p-4">
      <div className="grid grid-cols-2 gap-4 flex-1">
        {question.options.map((_, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            className={`${colors[index]} rounded-2xl shadow-md active:scale-95 transition-transform flex items-center justify-center`}
          >
            {/* We don't show text on player screen, just colors/shapes like real Kahoot */}
          </button>
        ))}
      </div>
    </div>
  );
}
