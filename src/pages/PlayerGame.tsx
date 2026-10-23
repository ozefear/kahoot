import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Check, X, Trophy, Flame, Medal, Clock, CheckCircle2 } from "lucide-react";
import { SHAPES } from "../components/Shapes";
import { motion } from "motion/react";
import { applyTheme, getTheme } from "../themes";

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

  const [theme, setTheme] = useState<string>(location.state?.theme || "sitcom");
  const [question, setQuestion] = useState<Question | null>(location.state?.initialQuestion || null);
  const [questionIndex, setQuestionIndex] = useState<number>(location.state?.questionIndex || 0);
  const [totalQuestions, setTotalQuestions] = useState<number>(location.state?.totalQuestions || 0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(location.state?.initialQuestion?.timeLimit || 20);
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
    applyTheme(theme);
  }, [theme]);

  // Timer countdown fallback (primary sync is server timer_tick)
  useEffect(() => {
    if (!question || result || gameOver) return;
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1050);
      return () => clearTimeout(timer);
    }
  }, [question, result, gameOver, timeLeft]);

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

          if (res.theme) {
            setTheme(res.theme);
            applyTheme(res.theme);
          }
          if (res.questionIndex !== undefined) setQuestionIndex(res.questionIndex);
          if (res.totalQuestions !== undefined) setTotalQuestions(res.totalQuestions);
          if (res.remainingTime !== undefined) setTimeLeft(res.remainingTime);
          else if (game.questions?.[game.currentQuestionIndex]?.timeLimit) {
            setTimeLeft(game.questions[game.currentQuestionIndex].timeLimit);
          }

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
          if (player.currentAnswerIndex !== undefined) {
            setAnswered(true);
            setSelectedOption(player.currentAnswerIndex);
          }
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
      if (typeof data.questionIndex === "number") setQuestionIndex(data.questionIndex);
      if (typeof data.totalQuestions === "number") setTotalQuestions(data.totalQuestions);
      if (data.theme) {
        setTheme(data.theme);
        applyTheme(data.theme);
      }
      setTimeLeft(data.question?.timeLimit || 20);
      setAnswered(false);
      setSelectedOption(null);
      setResult(null);
    };

    const onThemeUpdated = (data: any) => {
      if (data.theme) {
        setTheme(data.theme);
        applyTheme(data.theme);
      }
    };

    const onTimerTick = (data: { timeLeft: number }) => {
      if (typeof data?.timeLeft === "number") {
        setTimeLeft(data.timeLeft);
      }
    };

    const onQuestionResult = (data: any) => {
      setResult(data);
      setTimeLeft(0);
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
    socket.on("theme_updated", onThemeUpdated);
    socket.on("timer_tick", onTimerTick);
    socket.on("question_result", onQuestionResult);
    socket.on("game_over", onGameOver);
    socket.on("host_disconnected", onHostDisconnected);
    socket.on("host_reconnected", onHostReconnected);
    socket.on("you_are_kicked", onKicked);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_question", onNewQuestion);
      socket.off("theme_updated", onThemeUpdated);
      socket.off("timer_tick", onTimerTick);
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
    setSelectedOption(index);
    socket.emit("player_answer", { pin, answerIndex: index });
  };

  const rankLabel = (rank: number) => {
    if (rank === 1) return "🥇 1. sıradasın!";
    if (rank === 2) return "🥈 2. sıradasın!";
    if (rank === 3) return "🥉 3. sıradasın!";
    return `${rank}. sıradasın`;
  };

  if (gameOver) {
    const podiumColors = ["text-yellow-300", "text-slate-100", "text-amber-400"];
    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-white selection:bg-purple-500/30">
        <Trophy size={80} className="text-yellow-300 mb-6 drop-shadow-[0_0_20px_rgba(253,224,71,0.6)]" />
        <h1 className="text-4xl md:text-6xl font-black mb-3 text-white drop-shadow-md">Yarışma Bitti!</h1>
        <div className="text-2xl md:text-3xl font-black mb-6 text-purple-300 drop-shadow-sm">
          {name || sessionStorage.getItem("playerName")}
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--color-quiz-card)] border-2 border-white/20 text-white rounded-3xl p-6 md:p-8 text-center shadow-2xl w-full max-w-sm backdrop-blur-md"
        >
          <div className="text-xl md:text-2xl font-extrabold text-slate-300 uppercase tracking-widest mb-2">Final Skoru</div>
          <div className="text-5xl md:text-6xl font-black mb-6 text-white drop-shadow-md">{finalScore}</div>
          {finalRank > 0 && (
            <div className={`text-2xl md:text-3xl font-black drop-shadow-sm ${finalRank <= 3 ? podiumColors[finalRank - 1] : "text-slate-200"}`}>
              {rankLabel(finalRank)}
            </div>
          )}
          {totalPlayers > 0 && (
            <div className="text-base text-slate-300 font-bold mt-3">{totalPlayers} oyuncu arasında</div>
          )}
        </motion.div>
        <button
          onClick={() => navigate("/")}
          className="mt-8 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3.5 rounded-full font-black text-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer active:scale-95"
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
    const correctOptText = (question && question.options && result.correctOptionIndex !== undefined)
      ? question.options[result.correctOptionIndex]
      : null;
    const CorrectShape = result.correctOptionIndex !== undefined ? SHAPES[result.correctOptionIndex] : null;

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

        <div className="bg-black/40 backdrop-blur-md rounded-3xl p-6 md:p-8 text-center mt-4 md:mt-8 w-full max-w-sm border-2 border-white/20 shadow-2xl">
          <div className="text-xl md:text-2xl font-extrabold text-white uppercase tracking-widest mb-2">Puan</div>
          <div className="text-5xl md:text-6xl font-black text-white drop-shadow-md">+{result.pointsEarned}</div>
          <div className="text-lg md:text-xl text-white font-bold mt-2">Toplam: {result.score}</div>
        </div>

        {/* Show correct answer if the player was wrong */}
        {!result.correct && correctOptText && CorrectShape && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-black/50 backdrop-blur-md rounded-2xl p-4 w-full max-w-sm border-2 border-white/25 flex items-center gap-3 text-left shadow-lg"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow border border-white/30"
              style={{ backgroundColor: getTheme(theme).options[result.correctOptionIndex]?.hex || "#ef4444" }}
            >
              <CorrectShape className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs uppercase tracking-wider text-green-300 font-extrabold block">Doğru Cevap</span>
              <span className="font-black text-base md:text-lg text-white truncate block drop-shadow-sm">{correctOptText}</span>
            </div>
          </motion.div>
        )}

        {/* Player rank after question */}
        {result.rank && result.rank > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full font-black text-lg md:text-xl text-white border-2 border-white/25 shadow-lg"
          >
            <Medal size={22} className="text-yellow-300 drop-shadow" />
            <span>{rankLabel(result.rank)}</span>
            {result.totalPlayers && result.totalPlayers > 0 && (
              <span className="text-slate-300 font-bold text-base">/ {result.totalPlayers}</span>
            )}
          </motion.div>
        )}

        <div className="mt-8 text-lg md:text-xl font-black text-white drop-shadow animate-pulse">
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

  const currentTheme = getTheme(theme);

  if (answered) {
    const selectedShape = selectedOption !== null ? SHAPES[selectedOption] : null;
    const selectedText = (selectedOption !== null && question?.options) ? question.options[selectedOption] : null;
    const selectedOptTheme = selectedOption !== null ? currentTheme.options[selectedOption] : null;

    return (
      <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 md:p-8 text-white">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--color-quiz-card)] border-2 border-white/20 rounded-3xl p-6 md:p-8 text-center shadow-2xl w-full max-w-md flex flex-col items-center backdrop-blur-md"
        >
          <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center mb-4 text-purple-300">
            <CheckCircle2 size={38} />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-2 text-white drop-shadow-sm">Cevabın Alındı!</h2>
          {timeLeft > 0 && (
            <div className={`inline-flex items-center gap-1.5 font-black text-sm md:text-base px-4 py-1.5 rounded-full mb-3 shadow-sm ${
              timeLeft <= 5 
                ? "bg-red-500/30 text-red-200 border border-red-500/50 animate-pulse" 
                : "bg-purple-500/20 text-purple-200 border border-purple-400/40"
            }`}>
              <Clock size={16} />
              <span>Kalan Süre: {timeLeft}s</span>
            </div>
          )}
          <p className="text-slate-300 font-semibold text-base md:text-lg mb-6">
            Diğer oyuncuların cevaplaması bekleniyor...
          </p>

          {selectedText !== null && (
            <div
              className="w-full text-white rounded-2xl p-4 md:p-5 flex items-center gap-4 text-left shadow-xl border-2 border-white/30 mb-6"
              style={{ backgroundColor: selectedOptTheme?.hex || "#8b5cf6" }}
            >
              {selectedShape && (
                <div className="w-12 h-12 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  {(() => {
                    const ShapeComp = selectedShape;
                    return <ShapeComp className="w-6 h-6 text-white drop-shadow" />;
                  })()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs uppercase tracking-wider text-white/90 font-extrabold block mb-1">Seçtiğin Şık</span>
                <span className="font-black text-lg md:text-2xl leading-snug break-words block text-white drop-shadow-sm">{selectedText}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-300 font-bold text-sm animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span>Sonuçlar yükleniyor</span>
          </div>
        </motion.div>
        {disconnectedOverlay}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col p-3 md:p-6 text-white font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <span className="font-black text-sm md:text-base text-white bg-white/10 border border-white/20 px-4 py-1.5 rounded-full shadow-sm">
            {name || sessionStorage.getItem("playerName")}
          </span>
          {totalQuestions > 0 && (
            <span className="text-sm md:text-base font-extrabold text-slate-300">
              Soru {questionIndex + 1} / {totalQuestions}
            </span>
          )}
        </div>

        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 font-black text-sm md:text-base px-4 py-1.5 rounded-full transition-colors shadow-sm ${
            timeLeft <= 5 
              ? "bg-red-500/30 text-red-200 border border-red-500/50 animate-pulse" 
              : "bg-purple-500/20 text-purple-200 border border-purple-400/40"
          }`}>
            <Clock size={16} />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Question Title & Optional Image */}
      <div className="bg-[var(--color-quiz-card)] border-2 border-white/20 rounded-2xl md:rounded-3xl p-5 md:p-8 mb-4 md:mb-6 shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-md">
        <h2 className="text-2xl md:text-4xl font-black leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          {question.title}
        </h2>
        {question.image && (
          <div className="mt-4 max-h-36 md:max-h-56 w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/10">
            <img src={question.image} alt="Soru görseli" className="max-h-full max-w-full object-contain rounded-xl" />
          </div>
        )}
      </div>

      {/* Answer Options Grid with Shapes AND Text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5 flex-1 min-h-0">
        {question.options.map((option, index) => {
          // If option is empty string and index >= 2, omit it if question has fewer options
          if (!option && index >= 2) return null;
          const Shape = SHAPES[index];
          const themeOpt = currentTheme.options[index] || currentTheme.options[0];
          const colorClass = themeOpt.bg;
          const shadowClass = themeOpt.shadow;

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              style={{ backgroundColor: themeOpt.hex }}
              className={`${colorClass} rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl hover:${shadowClass} hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-4 md:gap-5 text-left border-2 border-white/25 min-h-[85px] md:min-h-[115px] group cursor-pointer`}
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner border border-white/20">
                <Shape className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" />
              </div>
              <span className="text-white font-black text-xl md:text-3xl flex-1 leading-snug break-words drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] select-none">
                {option}
              </span>
            </button>
          );
        })}
      </div>
      {disconnectedOverlay}
    </div>
  );
}
