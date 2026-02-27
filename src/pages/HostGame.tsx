import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, Trophy, ArrowRight, TrendingUp, Volume2, VolumeX } from "lucide-react";
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
      if (audioEnabled && questionAudioRef.current) {
        questionAudioRef.current.play().catch(e => console.log("Audio play prevented"));
      }
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
      if (audioEnabled && podiumAudioRef.current) {
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

  const toggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (next && step === "question" && questionAudioRef.current) {
        questionAudioRef.current.play().catch(e => console.log(e));
      } else if (!next && questionAudioRef.current) {
        questionAudioRef.current.pause();
      }
      return next;
    });
  };

  if (gameOver) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-[var(--text-primary)] selection:bg-purple-500/30">
        <Trophy size={80} className="text-yellow-400 mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        <h1 className="text-4xl md:text-6xl font-black mb-12">Sıralama</h1>
        <div className="flex items-end gap-4 md:gap-8 h-64 md:h-96">
          {finalLeaderboard[1] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: "spring" }} className="flex flex-col items-center">
              <div className="text-xl md:text-2xl font-bold mb-4 truncate w-24 md:w-32 text-center">{finalLeaderboard[1].name}</div>
              <div className="w-24 md:w-32 h-32 md:h-48 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-t-3xl flex items-center justify-center text-4xl font-black text-[var(--text-secondary)]">2</div>
              <div className="mt-4 font-bold text-lg md:text-xl text-[var(--text-secondary)]">{finalLeaderboard[1].score} puan</div>
            </motion.div>
          )}
          {finalLeaderboard[0] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, type: "spring" }} className="flex flex-col items-center">
              <div className="text-2xl md:text-3xl font-bold mb-4 truncate w-32 md:w-40 text-center">{finalLeaderboard[0].name}</div>
              <div className="w-32 md:w-40 h-48 md:h-64 bg-yellow-400/20 border-2 border-yellow-400 rounded-t-3xl flex items-center justify-center text-6xl font-black text-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)]">1</div>
              <div className="mt-4 font-bold text-xl md:text-2xl text-yellow-400">{finalLeaderboard[0].score} puan</div>
            </motion.div>
          )}
          {finalLeaderboard[2] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring" }} className="flex flex-col items-center">
              <div className="text-lg md:text-xl font-bold mb-4 truncate w-20 md:w-28 text-center">{finalLeaderboard[2].name}</div>
              <div className="w-20 md:w-28 h-24 md:h-32 bg-orange-400/20 border border-orange-400 rounded-t-3xl flex items-center justify-center text-3xl font-black text-orange-400">3</div>
              <div className="mt-4 font-bold text-base md:text-lg text-orange-400">{finalLeaderboard[2].score} puan</div>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => navigate("/")}
          className="mt-16 bg-purple-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-purple-700 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex items-center justify-center text-[var(--text-primary)] text-4xl font-bold">
        Yükleniyor...
      </div>
    );
  }

  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
  const borderColors = ["border-red-500", "border-blue-500", "border-yellow-500", "border-green-500"];
  const textColors = ["text-red-500", "text-blue-500", "text-yellow-500", "text-green-500"];

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
      <header className="flex justify-between items-center px-8 py-6">
        <div className="flex flex-col">
          <span className="text-[var(--text-secondary)] font-bold tracking-[0.2em] text-xs uppercase mb-1">
            Yarışma
          </span>
          <span className="text-xl font-bold">
            PIN: <span className="text-purple-600 dark:text-purple-400">{pin}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <button onClick={toggleAudio} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} className="text-red-500" />}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[var(--text-secondary)] font-bold tracking-[0.2em] text-xs uppercase mb-1">
              Soru
            </span>
            <span className="text-xl font-bold">
              {questionIndex + 1} <span className="text-[var(--text-secondary)]">/ {totalQuestions}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 w-full h-[calc(100vh-100px)] overflow-hidden relative">
        {step === "leaderboard" && resultData ? (
          <div className="w-full max-w-4xl flex flex-col items-center h-full justify-center pb-12">
            
            {resultData.highestClimber && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="mb-8 flex items-center gap-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 px-6 py-3 rounded-full font-bold text-lg shadow-sm border border-purple-500/30"
              >
                <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
                <span>{resultData.highestClimber.name} yükselişte! {resultData.highestClimber.change} sıra yükseldi!</span>
              </motion.div>
            )}

            <div className="w-full flex flex-col gap-3 md:gap-4">
              {resultData.leaderboard.slice(0, 5).map((player: any, index: number) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between bg-[var(--color-quiz-card)] p-4 md:p-6 rounded-2xl border border-[var(--border-color)] shadow-sm"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-xl ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
                      index === 1 ? 'bg-gray-300 text-gray-800' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-[var(--input-bg)] text-[var(--text-secondary)]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{player.name}</div>
                  </div>
                  <div className="text-xl md:text-2xl font-black text-purple-600 dark:text-purple-400">
                    {player.score}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-center mb-8 flex-shrink-0 leading-tight">
              {question.title}
            </h1>

            <div className="flex-1 relative w-full mb-4 md:mb-8 flex flex-col md:flex-row items-center justify-center min-h-0 gap-4 md:gap-8">
              <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-full bg-[var(--color-quiz-bg)]/80 backdrop-blur-md border-4 border-purple-500 flex items-center justify-center text-3xl md:text-5xl font-black shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                {timeLeft}
              </div>
              {question.image && (
                <div className="flex-1 h-full w-full relative flex items-center justify-center min-h-0 min-w-0">
                  <img src={question.image} alt="Question" className="max-w-full max-h-full object-contain rounded-2xl md:rounded-3xl" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full flex-shrink-0">
              {question.options.map((opt, index) => {
                const Shape = SHAPES[index];
                const isCorrect = showResult && resultData?.correctOptionIndex === index;
                const isWrong = showResult && resultData?.correctOptionIndex !== index;
                
                return (
                  <div
                    key={index}
                    className={`relative p-5 md:p-6 rounded-2xl flex items-center gap-6 transition-all duration-500 bg-[var(--color-quiz-card)] border-l-8 ${borderColors[index]} ${
                      isWrong ? "opacity-40 scale-[0.98] grayscale-[30%]" : ""
                    } ${isCorrect ? "ring-2 ring-white/20 z-10 scale-[1.02] bg-white/10" : ""}`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center ${textColors[index]}`}>
                      <Shape className="w-full h-full" />
                    </div>
                    <div className="text-xl md:text-2xl font-bold flex-1 break-words leading-tight text-[var(--text-primary)]">{opt}</div>
                    
                    {isCorrect && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.6 }}
                        className="absolute top-1/2 -translate-y-1/2 right-6"
                      >
                        <Check size={32} className="text-green-500 dark:text-green-400" />
                      </motion.div>
                    )}
                    
                    {showResult && resultData && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-2 right-4 text-[var(--text-secondary)] font-bold text-lg"
                      >
                        {resultData.answerCounts[index]} yanıt
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="p-6 flex justify-between items-center">
        <div className="text-[var(--text-secondary)] font-medium">
          {step === "question" && !showResult && (
            <span>{answersCount} Yanıt</span>
          )}
        </div>
        <button
          onClick={handleNext}
          className="bg-[var(--text-primary)] text-[var(--color-quiz-bg)] px-6 py-3 rounded-full font-bold hover:opacity-80 flex items-center gap-2 transition-opacity"
        >
          {showResult ? "Sonraki" : "Geç"} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
