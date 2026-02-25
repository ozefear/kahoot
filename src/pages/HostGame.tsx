import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, Trophy, ArrowRight, TrendingUp } from "lucide-react";
import { SHAPES } from "../components/Shapes";
import { motion } from "motion/react";
import question10Audio from "../audio/question10.mp3";
import question20Audio from "../audio/question20.mp3";
import question30Audio from "../audio/question30.mp3";
import question60Audio from "../audio/question60.mp3";
import podiumAudio from "../audio/podium.mp3";

const QUESTION_AUDIO: Record<number, string> = {
  10: question10Audio,
  20: question20Audio,
  30: question30Audio,
  60: question60Audio,
};

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

type HighestClimber = {
  name: string;
  change: number;
  newRank: number;
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
    highestClimber: HighestClimber | null;
  } | null>(null);
  const [step, setStep] = useState<"question" | "result" | "leaderboard">("question");
  const [gameOver, setGameOver] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Audio refs
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const podiumAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentQuestionTimeLimit = useRef<number>(20);

  useEffect(() => {
    // Initialize audio objects
    podiumAudioRef.current = new Audio(podiumAudio);

    return () => {
      // Cleanup audio on unmount
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current.currentTime = 0;
      }
      if (podiumAudioRef.current) {
        podiumAudioRef.current.pause();
        podiumAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    // Attempt to rejoin
    socket.emit("rejoin_host", { pin }, (res: any) => {
      if (res.success) {
        const game = res.game;
        setTotalQuestions(game.questions.length);
        setQuestionIndex(game.currentQuestionIndex);
        setQuestion(game.questions[game.currentQuestionIndex]);
        
        if (game.status === "leaderboard" && game.lastResultData) {
          setResultData(game.lastResultData);
          setShowResult(true);
          setStep("result");
        } else if (game.status === "question") {
          const elapsed = Math.floor((Date.now() - game.questionStartTime) / 1000);
          setTimeLeft(Math.max(0, game.questions[game.currentQuestionIndex].timeLimit - elapsed));
        }
      }
    });

    socket.on("new_question", (data) => {
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.question.timeLimit);
      setAnswersCount(0);
      setShowResult(false);
      setResultData(null);
      setStep("question");
      
      currentQuestionTimeLimit.current = data.question.timeLimit;

      // Play question music
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current.currentTime = 0;
      }
      
      const audioSrc = QUESTION_AUDIO[data.question.timeLimit] || question20Audio;
      questionAudioRef.current = new Audio(audioSrc);
      questionAudioRef.current.play().catch(e => console.log("Audio play prevented"));
    });

    socket.on("player_answered", () => {
      setAnswersCount((prev) => prev + 1);
    });

    socket.on("question_result", (data) => {
      setShowResult(true);
      setResultData(data);
      setStep("result");

      // If answered early, skip to the result sound part of the audio
      if (questionAudioRef.current) {
        const timeLimit = currentQuestionTimeLimit.current;
        if (questionAudioRef.current.currentTime < timeLimit) {
           questionAudioRef.current.currentTime = timeLimit;
        }
      }
    });

    socket.on("game_over", (data) => {
      setGameOver(true);
      setFinalLeaderboard(data.leaderboard);

      // Stop other music, play podium music
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
      }
      if (podiumAudioRef.current) {
        podiumAudioRef.current.play().catch(e => console.log("Audio play prevented"));
      }
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
    if (step === "result") {
      setStep("leaderboard");
    } else {
      socket.emit("host_next_step", { pin });
    }
  };

  const enableAudio = () => {
    setAudioEnabled(true);
    if (step === "question" && questionAudioRef.current) {
      questionAudioRef.current.play().catch(e => console.log(e));
    }
  };

  if (gameOver) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4 md:p-8 text-white">
        <Trophy size={80} className="text-yellow-400 mb-8" />
        <h1 className="text-4xl md:text-6xl font-black mb-12">Podium</h1>
        <div className="flex items-end gap-4 md:gap-8 h-64 md:h-96">
          {finalLeaderboard[1] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: "spring" }} className="flex flex-col items-center">
              <div className="text-xl md:text-2xl font-bold mb-4 truncate w-24 md:w-32 text-center">{finalLeaderboard[1].name}</div>
              <div className="w-24 md:w-32 h-32 md:h-48 bg-gray-300 rounded-t-xl flex items-center justify-center text-4xl font-black text-gray-800">2</div>
              <div className="mt-4 font-bold text-lg md:text-xl">{finalLeaderboard[1].score}</div>
            </motion.div>
          )}
          {finalLeaderboard[0] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, type: "spring" }} className="flex flex-col items-center">
              <div className="text-2xl md:text-3xl font-bold mb-4 truncate w-32 md:w-40 text-center">{finalLeaderboard[0].name}</div>
              <div className="w-32 md:w-40 h-48 md:h-64 bg-yellow-400 rounded-t-xl flex items-center justify-center text-6xl font-black text-yellow-800">1</div>
              <div className="mt-4 font-bold text-xl md:text-2xl">{finalLeaderboard[0].score}</div>
            </motion.div>
          )}
          {finalLeaderboard[2] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring" }} className="flex flex-col items-center">
              <div className="text-lg md:text-xl font-bold mb-4 truncate w-20 md:w-28 text-center">{finalLeaderboard[2].name}</div>
              <div className="w-20 md:w-28 h-24 md:h-32 bg-orange-400 rounded-t-xl flex items-center justify-center text-3xl font-black text-orange-900">3</div>
              <div className="mt-4 font-bold text-base md:text-lg">{finalLeaderboard[2].score}</div>
            </motion.div>
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
        <div className="flex items-center gap-4">
          <div className="text-lg md:text-xl font-bold text-gray-500">
            Question {questionIndex + 1} of {totalQuestions}
          </div>
          {!audioEnabled && (
            <button onClick={enableAudio} className="bg-red-100 text-red-600 px-3 py-1 rounded-lg font-bold text-sm">
              Enable Audio
            </button>
          )}
        </div>
        <div className="text-2xl md:text-3xl font-black text-indigo-600">PIN: {pin}</div>
        <button
          onClick={handleNext}
          className="bg-indigo-600 text-white px-4 md:px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
        >
          {showResult ? "Next" : "Skip"} <ArrowRight size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-6xl mx-auto w-full">
        {step === "leaderboard" && resultData ? (
          <div className="w-full max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-black text-center text-gray-800 mb-12">Top 5</h1>
            <div className="space-y-4">
              {resultData.leaderboard.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-4 md:p-6 rounded-2xl shadow-md flex justify-between items-center text-xl md:text-2xl font-bold"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 w-8">{idx + 1}.</span>
                    <span className="text-indigo-900">{player.name}</span>
                  </div>
                  <span className="text-indigo-600">{player.score}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl md:text-5xl font-black text-center text-gray-800 mb-6 md:mb-8">
              {question.title}
            </h1>

            {question.image && (
              <div className="w-full max-w-2xl h-48 md:h-64 bg-white rounded-2xl shadow-md overflow-hidden mb-6 md:mb-8">
                <img src={question.image} alt="Question" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex justify-between w-full max-w-4xl mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl md:text-4xl font-black shadow-lg">
                {timeLeft}
              </div>
              
              {showResult && resultData?.highestClimber && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-xl font-bold text-sm md:text-lg shadow-sm"
                >
                  <TrendingUp size={24} />
                  <span>{resultData.highestClimber.name} went up {resultData.highestClimber.change} places!</span>
                </motion.div>
              )}

              <div className="flex flex-col items-end justify-center">
                <div className="text-3xl md:text-4xl font-black text-gray-800">{answersCount}</div>
                <div className="text-sm md:text-xl font-bold text-gray-500 uppercase tracking-widest">Answers</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
              {question.options.map((opt, index) => {
                const Shape = SHAPES[index];
                return (
                  <div
                    key={index}
                    className={`relative p-4 md:p-6 rounded-2xl shadow-md flex items-center gap-4 min-h-[80px] md:min-h-[120px] transition-opacity ${colors[index]} ${
                      showResult && resultData?.correctOptionIndex !== index ? "opacity-30" : ""
                    }`}
                  >
                    <div className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0 text-white flex items-center justify-center">
                      <Shape className="w-full h-full" />
                    </div>
                    <div className="text-white text-xl md:text-3xl font-bold flex-1">{opt}</div>
                    
                    {showResult && resultData?.correctOptionIndex === index && (
                      <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/20 p-1 md:p-2 rounded-full">
                        <Check size={24} className="text-white md:w-8 md:h-8" />
                      </div>
                    )}
                    
                    {showResult && resultData && (
                      <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-black/30 px-3 py-1 md:px-4 md:py-1 rounded-full text-white font-bold text-lg md:text-xl">
                        {resultData.answerCounts[index]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
