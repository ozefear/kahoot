import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Trophy, ChevronDown, ChevronUp, Users, BarChart2, Medal, ArrowLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type GameSummary = {
    id: string;
    pin: string;
    title: string;
    date: string;
    total_players: number;
};

type QuestionData = {
    title: string;
    options: string[];
    correctOptionIndex: number;
    answerCounts: number[];
    correctRate: number;
    fastestMs?: number;
};

type PlayerData = {
    name: string;
    score: number;
    streak: number;
    finalRank: number;
    correctCount: number;
    wrongCount: number;
    answers: { questionIndex: number; answerIndex?: number; correct: boolean; pointsEarned: number; timeTakenMs?: number }[];
};

type GameDetail = {
    id: string;
    pin: string;
    title: string;
    date: string;
    total_players: number;
    questions_data: QuestionData[];
    players_data: PlayerData[];
    leaderboard: { name: string; score: number }[];
};

const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
const OPTION_LABELS = ["A", "B", "C", "D"];

export default function GameResults() {
    const navigate = useNavigate();
    const [hostNickname, setHostNickname] = useState(sessionStorage.getItem("hostNickname") || "");
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<GameSummary[]>([]);
    const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = () => {
        if (!hostNickname.trim()) return;
        sessionStorage.setItem("hostNickname", hostNickname);
        setLoading(true);
        setError("");
        socket.emit("get_game_results", { hostNickname }, (res: any) => {
            setLoading(false);
            setSearched(true);
            if (res.success) {
                setResults(res.results);
            } else {
                setError(res.error || "Hata oluştu");
            }
        });
    };

    const handleSelectGame = (id: string) => {
        setLoading(true);
        socket.emit("get_game_detail", { id }, (res: any) => {
            setLoading(false);
            if (res.success) {
                setSelectedGame(res.result);
                setExpandedQuestion(null);
            } else {
                setError(res.error || "Detay alınamadı");
            }
        });
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
        } catch {
            return iso;
        }
    };

    const formatMs = (ms?: number) => {
        if (!ms) return "—";
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
            {/* Header */}
            <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-[var(--border-color)] bg-[var(--color-quiz-bg)]/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => selectedGame ? setSelectedGame(null) : navigate("/host/create")}
                        className="p-2 rounded-xl hover:bg-[var(--input-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                        {selectedGame ? selectedGame.title : "Geçmiş Sonuçlar"}
                    </h1>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-10">
                {/* Search bar */}
                {!selectedGame && (
                    <div className="flex gap-3 mb-8">
                        <input
                            type="text"
                            placeholder="Sunucu adını girin..."
                            value={hostNickname}
                            onChange={e => setHostNickname(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSearch()}
                            className="flex-1 p-4 bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl text-lg font-bold outline-none focus:border-purple-500 text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                        >
                            {loading ? "..." : "Ara"}
                        </button>
                    </div>
                )}

                {error && <p className="text-red-500 font-medium mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

                {/* Games list */}
                {!selectedGame && searched && (
                    <>
                        {results.length === 0 ? (
                            <div className="text-center text-[var(--text-secondary)] py-16 text-xl font-medium">
                                Bu sunucu adı ile kayıtlı oyun bulunamadı.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {results.map(game => (
                                    <motion.button
                                        key={game.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSelectGame(game.id)}
                                        className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl p-6 text-left hover:border-purple-500/50 hover:bg-[var(--input-bg)] transition-all shadow-sm group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-black text-xl text-[var(--text-primary)] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{game.title}</h3>
                                            <span className="bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/20">#{game.pin}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[var(--text-secondary)] text-sm">
                                            <span className="flex items-center gap-1.5"><Users size={14} /> {game.total_players} oyuncu</span>
                                            <span>{formatDate(game.date)}</span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Game detail */}
                {selectedGame && (
                    <div>
                        {/* Meta */}
                        <div className="flex flex-wrap gap-4 mb-8">
                            <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl px-6 py-4 flex items-center gap-3">
                                <Users size={20} className="text-purple-500" />
                                <div>
                                    <div className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Oyuncular</div>
                                    <div className="text-2xl font-black">{selectedGame.total_players}</div>
                                </div>
                            </div>
                            <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl px-6 py-4 flex items-center gap-3">
                                <BarChart2 size={20} className="text-purple-500" />
                                <div>
                                    <div className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Sorular</div>
                                    <div className="text-2xl font-black">{selectedGame.questions_data.length}</div>
                                </div>
                            </div>
                            <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl px-6 py-4 flex items-center gap-3">
                                <Trophy size={20} className="text-yellow-500" />
                                <div>
                                    <div className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Tarih</div>
                                    <div className="text-lg font-black">{formatDate(selectedGame.date)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Leaderboard */}
                            <section>
                                <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-400" /> Final Sıralaması</h2>
                                <div className="space-y-2">
                                    {selectedGame.players_data
                                        .sort((a, b) => a.finalRank - b.finalRank)
                                        .map((player, i) => (
                                            <div key={i} className="flex items-center justify-between bg-[var(--color-quiz-card)] border border-[var(--border-color)] px-5 py-4 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${player.finalRank === 1 ? "bg-yellow-400 text-yellow-900" :
                                                            player.finalRank === 2 ? "bg-gray-300 text-gray-800" :
                                                                player.finalRank === 3 ? "bg-orange-400 text-orange-900" :
                                                                    "bg-[var(--input-bg)] text-[var(--text-secondary)]"
                                                        }`}>{player.finalRank}</div>
                                                    <div>
                                                        <div className="font-bold">{player.name}</div>
                                                        <div className="text-xs text-[var(--text-secondary)]">
                                                            ✓ {player.correctCount} &nbsp;✗ {player.wrongCount}
                                                            {player.streak >= 3 && <span className="ml-2 text-orange-400">🔥 {player.streak} seri</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="font-black text-xl text-purple-600 dark:text-purple-400">{player.score}</div>
                                            </div>
                                        ))}
                                </div>
                            </section>

                            {/* Questions breakdown */}
                            <section>
                                <h2 className="text-xl font-black mb-4 flex items-center gap-2"><BarChart2 size={20} className="text-purple-400" /> Soru Analizi</h2>
                                <div className="space-y-3">
                                    {selectedGame.questions_data.map((q, qi) => {
                                        const isExpanded = expandedQuestion === qi;
                                        const total = q.answerCounts.reduce((a, b) => a + b, 0);
                                        return (
                                            <div key={qi} className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedQuestion(isExpanded ? null : qi)}
                                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--input-bg)] transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <span className="font-bold text-[var(--text-secondary)] text-sm w-6 flex-shrink-0">Q{qi + 1}</span>
                                                        <span className="font-bold text-sm truncate">{q.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                        <span className={`text-sm font-black ${q.correctRate >= 60 ? "text-green-500" : q.correctRate >= 30 ? "text-yellow-500" : "text-red-500"}`}>
                                                            %{q.correctRate}
                                                        </span>
                                                        {isExpanded ? <ChevronUp size={16} className="text-[var(--text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--text-secondary)]" />}
                                                    </div>
                                                </button>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-5 pb-5 space-y-2 border-t border-[var(--border-color)] pt-4">
                                                                {q.options.map((opt, oi) => {
                                                                    const count = q.answerCounts[oi] || 0;
                                                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                                                    const isCorrect = oi === q.correctOptionIndex;
                                                                    return (
                                                                        <div key={oi}>
                                                                            <div className="flex justify-between text-sm mb-1">
                                                                                <span className={`font-bold ${isCorrect ? "text-green-500" : "text-[var(--text-secondary)]"}`}>
                                                                                    {OPTION_LABELS[oi]}. {opt} {isCorrect && "✓"}
                                                                                </span>
                                                                                <span className="font-bold text-[var(--text-secondary)]">{count} ({pct}%)</span>
                                                                            </div>
                                                                            <div className="h-2 bg-[var(--input-bg)] rounded-full overflow-hidden">
                                                                                <motion.div
                                                                                    initial={{ width: 0 }}
                                                                                    animate={{ width: `${pct}%` }}
                                                                                    transition={{ duration: 0.5, delay: oi * 0.05 }}
                                                                                    className={`h-full rounded-full ${COLORS[oi]} ${isCorrect ? "opacity-100" : "opacity-50"}`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {q.fastestMs !== undefined && (
                                                                    <p className="text-xs text-[var(--text-secondary)] pt-2">En hızlı doğru: {formatMs(q.fastestMs)}</p>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
