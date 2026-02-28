import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, Trophy, ArrowRight, TrendingUp, Volume2, VolumeX, Flame, BarChart2 } from "lucide-react";
import { SHAPES } from "../components/Shapes";
import { motion, AnimatePresence } from "motion/react";

const QUESTION_AUDIO: Record<number, string> = {
  10: "/audio/question10.mp3",
  20: "/audio/question20.mp3",
  30: "/audio/question30.mp3",
  60: "/audio/question60.mp3",
};

const PODIUM_AUDIO = "/audio/podium.mp3";

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
  streak?: number;
  rank?: number;
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
  const [totalPlayers, setTotalPlayers] = useState(0);
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
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  // For animated podium reveal: which spots have been revealed
  const [revealedSpots, setRevealedSpots] = useState<number[]>([]);

  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const podiumAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentQuestionTimeLimit = useRef<number>(20);

  useEffect(() => {
    podiumAudioRef.current = new Audio(PODIUM_AUDIO);
    return () => {
      questionAudioRef.current?.pause();
      podiumAudioRef.current?.pause();
    };
  }, []);

  // Podium staggered reveal
  useEffect(() => {
    if (!gameOver) return;
    setRevealedSpots([]);
    // Reveal 3rd, then 2nd, then 1st with delays
    const delays = [600, 1600, 2800];
    const timeouts = delays.map((delay, i) =>
      setTimeout(() => setRevealedSpots(prev => [...prev, i]), delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [gameOver]);

  useEffect(() => {
    const performRejoin = () => {
      socket.emit("rejoin_host", { pin }, (res: any) => {
        if (res.success) {
          const game = res.game;
          setTotalQuestions(game.questions.length);
          setQuestionIndex(game.currentQuestionIndex);
          setQuestion(game.questions[game.currentQuestionIndex]);
          setTotalPlayers(game.players.filter((p: any) => p.isConnected).length);

          if (game.status === "leaderboard" && game.lastResultData) {
            setResultData(game.lastResultData);
            setShowResult(true);
            setStep("result");
          } else if (game.status === "question") {
            const elapsed = Math.floor((Date.now() - game.questionStartTime) / 1000);
            setTimeLeft(Math.max(0, game.questions[game.currentQuestionIndex].timeLimit - elapsed));
            const alreadyAnswered = game.players.filter((p: any) => p.currentAnswerIndex !== undefined).length;
            setAnswersCount(alreadyAnswered);
          }
        }
      });
    };

    performRejoin();

    const onConnect = () => performRejoin();

    const onNewQuestion = (data: any) => {
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.question.timeLimit);
      setAnswersCount(0);
      setTotalPlayers(data.totalPlayers || 0);
      setShowResult(false);
      setResultData(null);
      setStep("question");
      currentQuestionTimeLimit.current = data.question.timeLimit;

      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current.currentTime = 0;
      }
      const audioSrc = QUESTION_AUDIO[data.question.timeLimit] || QUESTION_AUDIO[20];
      questionAudioRef.current = new Audio(audioSrc);
      if (audioEnabled && questionAudioRef.current) {
        questionAudioRef.current.play().catch(() => { });
      }
    };

    const onPlayerAnswered = (data: any) => {
      setAnswersCount(prev => prev + 1);
      if (data.totalConnected) setTotalPlayers(data.totalConnected);
    };

    const onPlayerJoined = () => {
      setTotalPlayers(prev => prev + 1);
    };

    const onPlayerLeft = () => {
      setTotalPlayers(prev => Math.max(0, prev - 1));
    };

    const onQuestionResult = (data: any) => {
      setShowResult(true);
      setResultData(data);
      setStep("result");

      if (questionAudioRef.current) {
        const timeLimit = currentQuestionTimeLimit.current;
        if (questionAudioRef.current.currentTime < timeLimit) {
          questionAudioRef.current.currentTime = timeLimit;
        }
      }
    };

    const onGameOver = (data: any) => {
      setGameOver(true);
      setFinalLeaderboard(data.leaderboard);
      questionAudioRef.current?.pause();
      if (audioEnabled && podiumAudioRef.current) {
        podiumAudioRef.current.play().catch(() => { });
      }
    };

    const onGameSaved = (data: any) => {
      setSavedGameId(data.id);
    };

    socket.on("connect", onConnect);
    socket.on("new_question", onNewQuestion);
    socket.on("player_answered", onPlayerAnswered);
    socket.on("player_joined", onPlayerJoined);
    socket.on("player_left", onPlayerLeft);
    socket.on("question_result", onQuestionResult);
    socket.on("game_over", onGameOver);
    socket.on("game_saved", onGameSaved);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_question", onNewQuestion);
      socket.off("player_answered", onPlayerAnswered);
      socket.off("player_joined", onPlayerJoined);
      socket.off("player_left", onPlayerLeft);
      socket.off("question_result", onQuestionResult);
      socket.off("game_over", onGameOver);
      socket.off("game_saved", onGameSaved);
    };
  }, [audioEnabled, pin]);

  useEffect(() => {
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
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
    setAudioEnabled(prev => {
      const next = !prev;
      if (next && step === "question" && questionAudioRef.current) {
        questionAudioRef.current.play().catch(() => { });
      } else if (!next && questionAudioRef.current) {
        questionAudioRef.current.pause();
      }
      return next;
    });
  };

  // ── Animated Podium (Game Over) ──────────────────────────────────────────
  if (gameOver) {
    // Order: index 1 = 2nd place, index 0 = 1st place, index 2 = 3rd place (display order)
    const displayOrder = [
      { entry: finalLeaderboard[1], place: 2, spotIdx: 0 },
      { entry: finalLeaderboard[0], place: 1, spotIdx: 1 },
      { entry: finalLeaderboard[2], place: 3, spotIdx: 2 },
    ];

    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-[var(--text-primary)] selection:bg-purple-500/30 overflow-hidden">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] mx-auto" />
          <h1 className="text-4xl md:text-6xl font-black mb-12 text-center">Sıralama</h1>
        </motion.div>

        <div className="flex items-end gap-4 md:gap-8 h-64 md:h-96 mb-12">
          {displayOrder.map(({ entry, place, spotIdx }) => {
            if (!entry) return <div key={place} className="w-24 md:w-32" />;
            const isRevealed = revealedSpots.includes(spotIdx);
            const heights: Record<number, string> = { 1: "h-48 md:h-64", 2: "h-32 md:h-48", 3: "h-24 md:h-32" };
            const widths: Record<number, string> = { 1: "w-32 md:w-40", 2: "w-24 md:w-32", 3: "w-20 md:w-28" };
            const podiumStyles: Record<number, string> = {
              1: "bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]",
              2: "bg-gray-400/10 border border-gray-400 text-gray-400",
              3: "bg-orange-400/10 border border-orange-400 text-orange-400",
            };
            const nameSize: Record<number, string> = { 1: "text-2xl md:text-3xl", 2: "text-xl md:text-2xl", 3: "text-lg md:text-xl" };

            return (
              <AnimatePresence key={place}>
                {isRevealed && (
                  <motion.div
                    initial={{ y: 120, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4, duration: 0.7 }}
                    className="flex flex-col items-center"
                  >
                    <div className={`font-bold mb-3 truncate text-center ${nameSize[place]}`} style={{ maxWidth: "10rem" }}>
                      {entry.name}
                    </div>
                    {entry.streak && entry.streak >= 3 && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="mb-2 text-orange-400 font-bold flex items-center gap-1 text-sm"
                      >
                        <Flame size={16} /> {entry.streak} seri
                      </motion.div>
                    )}
                    <div className={`${widths[place]} ${heights[place]} ${podiumStyles[place]} rounded-t-3xl flex items-center justify-center text-4xl md:text-6xl font-black`}>
                      {place}
                    </div>
                    <div className="mt-3 font-bold text-lg md:text-xl text-[var(--text-secondary)]">{entry.score} puan</div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Rest of leaderboard */}
        {finalLeaderboard.length > 3 && (
          <div className="w-full max-w-md space-y-2 mb-8">
            {finalLeaderboard.slice(3).map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 3.2 + i * 0.1 }}
                className="flex items-center justify-between bg-[var(--color-quiz-card)] px-5 py-3 rounded-2xl border border-[var(--border-color)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-secondary)] font-bold w-6">{i + 4}.</span>
                  <span className="font-bold">{player.name}</span>
                  {player.streak && player.streak >= 3 && (
                    <span className="text-orange-400 text-sm flex items-center gap-1"><Flame size={12} />{player.streak}</span>
                  )}
                </div>
                <span className="font-black text-purple-600 dark:text-purple-400">{player.score}</span>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.5 }}
          className="flex flex-wrap gap-4 justify-center mt-4"
        >
          {savedGameId && (
            <button
              onClick={() => navigate(`/host/results?id=${savedGameId}`)}
              className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-8 py-3 rounded-full font-bold text-lg hover:bg-[var(--input-bg)] transition-colors flex items-center gap-2"
            >
              <BarChart2 size={20} className="text-purple-500" />
              Detaylı Sonuçlar
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-purple-700 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            Ana Sayfaya Dön
          </button>
        </motion.div>
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
    <div className="h-screen w-screen overflow-hidden bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
      <header className="flex-shrink-0 flex justify-between items-center px-4 md:px-8 py-3 md:py-4">
        <div className="flex flex-col">
          <span className="text-[var(--text-secondary)] font-bold tracking-[0.2em] text-[10px] md:text-xs uppercase mb-1">Yarışma</span>
          <span className="text-xl font-bold">PIN: <span className="text-purple-600 dark:text-purple-400">{pin}</span></span>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={toggleAudio} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} className="text-red-500" />}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[var(--text-secondary)] font-bold tracking-[0.2em] text-xs uppercase mb-1">Soru</span>
            <span className="text-xl font-bold">{questionIndex + 1} <span className="text-[var(--text-secondary)]">/ {totalQuestions}</span></span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 w-full min-h-0 overflow-hidden relative">
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
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-xl ${index === 0 ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
                      index === 1 ? 'bg-gray-300 text-gray-800' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-[var(--input-bg)] text-[var(--text-secondary)]'
                      }`}>
                      {index + 1}
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{player.name}</div>
                    {/* Streak fire animation */}
                    {player.streak >= 3 && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], rotate: [-5, 5, -5] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="flex items-center gap-1 text-orange-400 font-bold text-sm"
                      >
                        <Flame size={18} className="text-orange-500" />
                        <span>{player.streak} seri!</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="text-xl md:text-2xl font-black text-purple-600 dark:text-purple-400">{player.score}</div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full max-w-6xl mx-auto min-h-0">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-center mb-2 md:mb-6 flex-shrink-0 leading-tight line-clamp-3">
              {question.title}
            </h1>

            <div className="flex-1 relative w-full mb-2 md:mb-6 flex flex-col md:flex-row items-center justify-center min-h-0 gap-4 md:gap-6">
              <div className="flex-shrink-0 w-16 h-16 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-[var(--color-quiz-bg)]/80 backdrop-blur-md border-4 border-purple-500 flex items-center justify-center text-2xl md:text-4xl lg:text-5xl font-black shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                {timeLeft}
              </div>
              {question.image && (
                <div className="flex-1 h-full w-full flex items-center justify-center min-h-0 min-w-0">
                  <img src={question.image} alt="Question" className="w-full h-full object-contain rounded-xl md:rounded-3xl" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 w-full flex-shrink-0">
              {question.options.map((opt, index) => {
                const Shape = SHAPES[index];
                const isCorrect = showResult && resultData?.correctOptionIndex === index;
                const isWrong = showResult && resultData?.correctOptionIndex !== index;

                return (
                  <div
                    key={index}
                    className={`relative p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 lg:gap-6 transition-all duration-500 bg-[var(--color-quiz-card)] border-l-8 ${borderColors[index]} ${isWrong ? "opacity-40 scale-[0.98] grayscale-[30%]" : ""} ${isCorrect ? "ring-2 ring-white/20 z-10 scale-[1.02] bg-white/10" : ""}`}
                  >
                    <div className={`w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex-shrink-0 flex items-center justify-center ${textColors[index]}`}>
                      <Shape className="w-full h-full" />
                    </div>
                    <div className="text-lg md:text-xl lg:text-2xl font-bold flex-1 break-words leading-tight text-[var(--text-primary)]">{opt}</div>

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
      <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center border-t border-[var(--border-color)]">
        <div className="text-[var(--text-secondary)] font-medium text-sm md:text-base">
          {step === "question" && !showResult && (
            <span className="font-bold">
              <span className="text-[var(--text-primary)]">{answersCount}</span>
              {totalPlayers > 0 && <span> / {totalPlayers}</span>}
              <span className="ml-1 text-[var(--text-secondary)]">Yanıt</span>
            </span>
          )}
        </div>
        <button
          onClick={handleNext}
          className="bg-[var(--text-primary)] text-[var(--color-quiz-bg)] px-4 md:px-6 py-2 md:py-3 text-sm md:text-base rounded-full font-bold hover:opacity-80 flex items-center gap-2 transition-opacity"
        >
          {showResult ? "Sonraki" : "Geç"} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
