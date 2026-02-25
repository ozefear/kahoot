import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, X, Trophy, ArrowRight } from "lucide-react";

type Question = {
  title: string;
  image?: string;
  options: string[];
  timeLimit: number;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
};

export default function HostGame() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{
    correctOptionIndex: number;
    answerCounts: number[];
    leaderboard: LeaderboardEntry[];
  } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    socket.on("new_question", (data) => {
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.question.timeLimit);
      setAnswersCount(0);
      setShowResult(false);
      setResultData(null);
    });

    socket.on("player_answered", () => {
      setAnswersCount((prev) => prev + 1);
    });

    socket.on("question_result", (data) => {
      setShowResult(true);
      setResultData(data);
    });

    socket.on("game_over", (data) => {
      setGameOver(true);
      setFinalLeaderboard(data.leaderboard);
    });

    return () => {
      socket.off("new_question");
      socket.off("player_answered");
      socket.off("question_result");
      socket.off("game_over");
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, showResult]);

  const handleNext = () => {
    socket.emit("host_next_step", { pin });
  };

  if (gameOver) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-8 text-white">
        <Trophy size={80} className="text-yellow-400 mb-8" />
        <h1 className="text-6xl font-black mb-12">Podium</h1>
        <div className="flex items-end gap-8 h-96">
          {finalLeaderboard[1] && (
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold mb-4">{finalLeaderboard[1].name}</div>
              <div className="w-32 h-48 bg-gray-300 rounded-t-xl flex items-center justify-center text-4xl font-black text-gray-800">2</div>
              <div className="mt-4 font-bold text-xl">{finalLeaderboard[1].score}</div>
            </div>
          )}
          {finalLeaderboard[0] && (
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold mb-4">{finalLeaderboard[0].name}</div>
              <div className="w-40 h-64 bg-yellow-400 rounded-t-xl flex items-center justify-center text-6xl font-black text-yellow-800">1</div>
              <div className="mt-4 font-bold text-2xl">{finalLeaderboard[0].score}</div>
            </div>
          )}
          {finalLeaderboard[2] && (
            <div className="flex flex-col items-center">
              <div className="text-xl font-bold mb-4">{finalLeaderboard[2].name}</div>
              <div className="w-28 h-32 bg-orange-400 rounded-t-xl flex items-center justify-center text-3xl font-black text-orange-900">3</div>
              <div className="mt-4 font-bold text-lg">{finalLeaderboard[2].score}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate("/")}
          className="mt-16 bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold text-xl hover:bg-gray-100"
        >
          Back to Home
        </button>
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

  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="text-xl font-bold text-gray-500">
          Question {questionIndex + 1} of {totalQuestions}
        </div>
        <div className="text-3xl font-black text-indigo-600">PIN: {pin}</div>
        <button
          onClick={handleNext}
          disabled={!showResult}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Next <ArrowRight size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-5xl font-black text-center text-gray-800 mb-8">
          {question.title}
        </h1>

        {question.image && (
          <div className="w-full max-w-2xl h-64 bg-white rounded-2xl shadow-md overflow-hidden mb-8">
            <img src={question.image} alt="Question" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex justify-between w-full max-w-4xl mb-8">
          <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-4xl font-black shadow-lg">
            {timeLeft}
          </div>
          <div className="flex flex-col items-end justify-center">
            <div className="text-4xl font-black text-gray-800">{answersCount}</div>
            <div className="text-xl font-bold text-gray-500 uppercase tracking-widest">Answers</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
          {question.options.map((opt, index) => (
            <div
              key={index}
              className={`relative p-6 rounded-2xl shadow-md flex items-center justify-center min-h-[120px] transition-opacity ${colors[index]} ${
                showResult && resultData?.correctOptionIndex !== index ? "opacity-30" : ""
              }`}
            >
              <div className="text-white text-3xl font-bold text-center">{opt}</div>
              
              {showResult && resultData?.correctOptionIndex === index && (
                <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full">
                  <Check size={32} className="text-white" />
                </div>
              )}
              
              {showResult && resultData && (
                <div className="absolute bottom-4 right-4 bg-black/30 px-4 py-1 rounded-full text-white font-bold text-xl">
                  {resultData.answerCounts[index]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
