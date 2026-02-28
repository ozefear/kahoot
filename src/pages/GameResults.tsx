import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { socket } from "../socket";
import {
    Trophy, ChevronDown, ChevronUp, Users, BarChart2, ArrowLeft,
    Sparkles, Download, Clock, Target, Zap, TrendingUp, AlertTriangle, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type GameSummary = { id: string; pin: string; title: string; date: string; total_players: number };

type PlayerAnswer = { questionIndex: number; answerIndex?: number; correct: boolean; pointsEarned: number; timeTakenMs?: number };

type QuestionData = {
    title: string; options: string[]; correctOptionIndex: number;
    answerCounts: number[]; correctRate: number; fastestMs?: number;
};

type PlayerData = {
    name: string; score: number; streak: number; finalRank: number;
    correctCount: number; wrongCount: number; answers: PlayerAnswer[];
};

type GameDetail = {
    id: string; pin: string; title: string; date: string; total_players: number;
    questions_data: QuestionData[]; players_data: PlayerData[];
    leaderboard: { name: string; score: number }[];
};

const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
const OPTION_LABELS = ["A", "B", "C", "D"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function formatMs(ms?: number) { return ms !== undefined ? `${(ms / 1000).toFixed(2)}s` : "—"; }
function formatDate(iso: string) {
    try { return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
}

// ── Download helpers ──────────────────────────────────────────────────────────
function downloadJSON(game: GameDetail) {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${game.title.replace(/\s+/g, "_")}_${game.pin}.json`;
    a.click(); URL.revokeObjectURL(url);
}

function downloadCSV(game: GameDetail) {
    const rows: string[][] = [];

    // ── Sheet 1: Summary ──
    rows.push(["=== ÖZET ==="]);
    rows.push(["Başlık", game.title]);
    rows.push(["PIN", game.pin]);
    rows.push(["Tarih", formatDate(game.date)]);
    rows.push(["Oyuncu Sayısı", String(game.total_players)]);
    rows.push(["Soru Sayısı", String(game.questions_data.length)]);
    rows.push([]);

    // ── Sheet 2: Leaderboard ──
    rows.push(["=== SIRA ==="]);
    rows.push(["Sıra", "İsim", "Puan", "Doğru", "Yanlış", "Doğruluk %", "En Uzun Seri", "Ort. Yanıt Süresi (s)"]);
    const sorted = [...game.players_data].sort((a, b) => a.finalRank - b.finalRank);
    sorted.forEach(p => {
        const times = p.answers.filter(a => a.timeTakenMs !== undefined).map(a => a.timeTakenMs!);
        const accuracyPct = p.answers.length > 0
            ? Math.round((p.correctCount / p.answers.length) * 100) : 0;
        rows.push([
            String(p.finalRank), p.name, String(p.score), String(p.correctCount),
            String(p.wrongCount), `${accuracyPct}%`, String(p.streak),
            times.length ? (avg(times) / 1000).toFixed(2) : "—"
        ]);
    });
    rows.push([]);

    // ── Sheet 3: Per-Question ──
    rows.push(["=== SORULAR ==="]);
    rows.push(["Q#", "Soru", "Doğru Seçenek", "Doğruluk %", "En Hızlı (s)", "A", "B", "C", "D"]);
    game.questions_data.forEach((q, i) => {
        rows.push([
            String(i + 1), q.title, OPTION_LABELS[q.correctOptionIndex],
            `${q.correctRate}%`, formatMs(q.fastestMs),
            ...q.answerCounts.map(String)
        ]);
    });
    rows.push([]);

    // ── Sheet 4: Per-Player Per-Question ──
    rows.push(["=== OYUNCU × SORU ==="]);
    const qHeaders = game.questions_data.map((q, i) => `Q${i + 1}: ${q.title.slice(0, 20)}`);
    rows.push(["İsim", ...qHeaders]);
    sorted.forEach(p => {
        const cells = game.questions_data.map((_, qi) => {
            const ans = p.answers.find(a => a.questionIndex === qi);
            if (!ans) return "—";
            return ans.correct ? `✓ +${ans.pointsEarned}` : `✗ (${OPTION_LABELS[ans.answerIndex ?? 0] || "?"})`;
        });
        rows.push([p.name, ...cells]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${game.title.replace(/\s+/g, "_")}_${game.pin}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "text-purple-500" }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className={`${color} flex-shrink-0`}>{icon}</div>
            <div>
                <div className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-2xl font-black leading-none">{value}</div>
                {sub && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GameResults() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [hostNickname, setHostNickname] = useState(sessionStorage.getItem("hostNickname") || "");
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<GameSummary[]>([]);
    const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"leaderboard" | "questions" | "players">("leaderboard");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Auto-load from ?id=
    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setLoading(true);
            socket.emit("get_game_detail", { id }, (res: any) => {
                setLoading(false);
                if (res.success) setSelectedGame(res.result);
                else setError(res.error || "Detay alınamadı");
            });
        }
    }, [searchParams]);

    const handleSearch = () => {
        if (!hostNickname.trim()) return;
        sessionStorage.setItem("hostNickname", hostNickname);
        setLoading(true); setError("");
        socket.emit("get_game_results", { hostNickname }, (res: any) => {
            setLoading(false); setSearched(true);
            if (res.success) setResults(res.results);
            else setError(res.error || "Hata oluştu");
        });
    };

    const handleSelectGame = (id: string) => {
        setLoading(true);
        socket.emit("get_game_detail", { id }, (res: any) => {
            setLoading(false);
            if (res.success) { setSelectedGame(res.result); setExpandedQuestion(null); setActiveTab("leaderboard"); }
            else setError(res.error || "Detay alınamadı");
        });
    };

    // ── Computed stats ──────────────────────────────────────────────────────────
    const stats = selectedGame ? (() => {
        const pd = selectedGame.players_data;
        const qd = selectedGame.questions_data;
        const scores = pd.map(p => p.score);
        const avgScore = Math.round(avg(scores));
        const maxScore = Math.max(...scores);
        const overallCorrectRate = Math.round(avg(qd.map(q => q.correctRate)));
        const hardestQ = [...qd].sort((a, b) => a.correctRate - b.correctRate)[0];
        const easiestQ = [...qd].sort((a, b) => b.correctRate - a.correctRate)[0];
        const allTimes = pd.flatMap(p => p.answers.filter(a => a.timeTakenMs !== undefined).map(a => a.timeTakenMs!));
        const avgResponseMs = allTimes.length ? avg(allTimes) : undefined;
        const totalAnswers = pd.reduce((s, p) => s + p.answers.length, 0);
        const totalCorrect = pd.reduce((s, p) => s + p.correctCount, 0);
        return { avgScore, maxScore, overallCorrectRate, hardestQ, easiestQ, avgResponseMs, totalAnswers, totalCorrect };
    })() : null;

    return (
        <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
            {/* Header */}
            <header className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-[var(--border-color)] bg-[var(--color-quiz-bg)]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => selectedGame ? (searchParams.get("id") ? navigate("/") : setSelectedGame(null)) : navigate("/host/create")}
                        className="p-2 rounded-xl hover:bg-[var(--input-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">
                            {selectedGame ? selectedGame.title : "Geçmiş Sonuçlar"}
                        </h1>
                        {selectedGame && (
                            <div className="text-xs text-[var(--text-secondary)] font-medium">
                                PIN #{selectedGame.pin} · {formatDate(selectedGame.date)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Download buttons */}
                {selectedGame && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => downloadCSV(selectedGame)}
                            className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600/20 transition-colors"
                        >
                            <Download size={16} /> CSV
                        </button>
                        <button
                            onClick={() => downloadJSON(selectedGame)}
                            className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-600/20 transition-colors"
                        >
                            <Download size={16} /> JSON
                        </button>
                    </div>
                )}
            </header>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-16">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {error && <p className="text-red-500 font-medium mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

                {/* Search */}
                {!selectedGame && !loading && (
                    <>
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text" placeholder="Sunucu adını girin..."
                                value={hostNickname} onChange={e => setHostNickname(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                                className="flex-1 p-4 bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl text-lg font-bold outline-none focus:border-purple-500 text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors"
                            />
                            <button onClick={handleSearch}
                                className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                Ara
                            </button>
                        </div>

                        {searched && results.length === 0 && (
                            <div className="text-center text-[var(--text-secondary)] py-16 text-xl font-medium">Bu sunucu adına ait kayıtlı oyun bulunamadı.</div>
                        )}

                        {results.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {results.map(game => (
                                    <motion.button key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSelectGame(game.id)}
                                        className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl p-6 text-left hover:border-purple-500/50 hover:bg-[var(--input-bg)] transition-all shadow-sm group">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-black text-xl group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{game.title}</h3>
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

                {/* Game Detail */}
                {selectedGame && !loading && stats && (
                    <div>
                        {/* ── Summary Stats Row ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                            <StatCard icon={<Users size={22} />} label="Oyuncular" value={selectedGame.total_players} />
                            <StatCard icon={<Target size={22} />} label="Ort. Doğruluk" value={`%${stats.overallCorrectRate}`}
                                color={stats.overallCorrectRate >= 60 ? "text-green-500" : stats.overallCorrectRate >= 30 ? "text-yellow-500" : "text-red-500"} />
                            <StatCard icon={<Zap size={22} />} label="Ort. Skor" value={stats.avgScore} sub={`Max: ${stats.maxScore}`} />
                            <StatCard icon={<Clock size={22} />} label="Ort. Süre" value={formatMs(stats.avgResponseMs)}
                                sub={`${stats.totalCorrect}/${stats.totalAnswers} doğru`} color="text-blue-500" />
                        </div>

                        {/* ── Highlights ── */}
                        <div className="grid md:grid-cols-2 gap-3 mb-8">
                            {stats.hardestQ && (
                                <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-4">
                                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">En Zor Soru (%{stats.hardestQ.correctRate} doğru)</div>
                                        <div className="font-bold text-sm leading-snug">{stats.hardestQ.title}</div>
                                    </div>
                                </div>
                            )}
                            {stats.easiestQ && (
                                <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4">
                                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">En Kolay Soru (%{stats.easiestQ.correctRate} doğru)</div>
                                        <div className="font-bold text-sm leading-snug">{stats.easiestQ.title}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Tabs ── */}
                        <div className="flex gap-2 mb-6 border-b border-[var(--border-color)]">
                            {(["leaderboard", "questions", "players"] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-3 font-bold text-sm rounded-t-xl transition-colors border-b-2 -mb-px ${activeTab === tab
                                        ? "border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/5"
                                        : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
                                    {tab === "leaderboard" ? "🏆 Sıralama" : tab === "questions" ? "📊 Sorular" : "👤 Oyuncular"}
                                </button>
                            ))}
                        </div>

                        {/* ── Leaderboard Tab ── */}
                        {activeTab === "leaderboard" && (
                            <div className="space-y-2">
                                {/* Header row */}
                                <div className="grid grid-cols-7 gap-2 px-5 pb-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                    <span className="col-span-1">#</span>
                                    <span className="col-span-2">İsim</span>
                                    <span className="text-right">Puan</span>
                                    <span className="text-right">Doğru</span>
                                    <span className="text-right">Süre</span>
                                    <span className="text-right">Seri</span>
                                </div>
                                {[...selectedGame.players_data].sort((a, b) => a.finalRank - b.finalRank).map((player, i) => {
                                    const times = player.answers.filter(a => a.timeTakenMs !== undefined).map(a => a.timeTakenMs!);
                                    const avgTime = times.length ? avg(times) : undefined;
                                    const accuracyPct = player.answers.length > 0 ? Math.round((player.correctCount / player.answers.length) * 100) : 0;
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="grid grid-cols-7 gap-2 items-center bg-[var(--color-quiz-card)] border border-[var(--border-color)] px-5 py-4 rounded-2xl">
                                            <div className={`col-span-1 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${player.finalRank === 1 ? "bg-yellow-400 text-yellow-900" : player.finalRank === 2 ? "bg-gray-300 text-gray-800" : player.finalRank === 3 ? "bg-orange-400 text-orange-900" : "bg-[var(--input-bg)] text-[var(--text-secondary)]"}`}>
                                                {player.finalRank}
                                            </div>
                                            <div className="col-span-2">
                                                <div className="font-bold">{player.name}</div>
                                                <div className="text-xs text-[var(--text-secondary)]">%{accuracyPct} doğru</div>
                                            </div>
                                            <div className="text-right font-black text-purple-600 dark:text-purple-400">{player.score}</div>
                                            <div className="text-right text-sm font-bold text-green-500">{player.correctCount}/{player.answers.length}</div>
                                            <div className="text-right text-sm font-bold text-[var(--text-secondary)]">{formatMs(avgTime)}</div>
                                            <div className="text-right text-sm font-bold text-orange-400">{player.streak >= 2 ? `🔥${player.streak}` : player.streak || "—"}</div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Questions Tab ── */}
                        {activeTab === "questions" && (
                            <div className="space-y-3">
                                {selectedGame.questions_data.map((q, qi) => {
                                    const isExpanded = expandedQuestion === qi;
                                    const total = q.answerCounts.reduce((a, b) => a + b, 0);
                                    // Find fastest correct player
                                    const fastestPlayer = selectedGame.players_data
                                        .map(p => ({ name: p.name, ans: p.answers.find(a => a.questionIndex === qi && a.correct) }))
                                        .filter(x => x.ans?.timeTakenMs !== undefined)
                                        .sort((a, b) => (a.ans!.timeTakenMs!) - (b.ans!.timeTakenMs!))[0];
                                    // Avg time for this question
                                    const qTimes = selectedGame.players_data
                                        .map(p => p.answers.find(a => a.questionIndex === qi)?.timeTakenMs)
                                        .filter((t): t is number => t !== undefined);
                                    const qAvgTime = qTimes.length ? avg(qTimes) : undefined;

                                    return (
                                        <div key={qi} className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                                            <button onClick={() => setExpandedQuestion(isExpanded ? null : qi)}
                                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--input-bg)] transition-colors text-left">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <span className="font-black text-[var(--text-secondary)] text-sm w-7 flex-shrink-0">Q{qi + 1}</span>
                                                    <span className="font-bold text-sm truncate">{q.title}</span>
                                                </div>
                                                <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                                                    <span className={`text-sm font-black ${q.correctRate >= 60 ? "text-green-500" : q.correctRate >= 30 ? "text-yellow-500" : "text-red-500"}`}>
                                                        %{q.correctRate}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-secondary)]">{formatMs(qAvgTime)}</span>
                                                    {isExpanded ? <ChevronUp size={16} className="text-[var(--text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--text-secondary)]" />}
                                                </div>
                                            </button>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                        <div className="px-5 pb-5 border-t border-[var(--border-color)] pt-4 space-y-3">
                                                            {/* Answer bars */}
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
                                                                            <span className="font-bold text-[var(--text-secondary)]">{count} kişi ({pct}%)</span>
                                                                        </div>
                                                                        <div className="h-3 bg-[var(--input-bg)] rounded-full overflow-hidden">
                                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                                                transition={{ duration: 0.5, delay: oi * 0.05 }}
                                                                                className={`h-full rounded-full ${COLORS[oi]} ${isCorrect ? "opacity-100" : "opacity-40"}`} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Quick stats row */}
                                                            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[var(--border-color)] text-sm">
                                                                {fastestPlayer && (
                                                                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                                        <TrendingUp size={14} className="text-purple-500" />
                                                                        <span>En Hızlı: <strong className="text-[var(--text-primary)]">{fastestPlayer.name}</strong> ({formatMs(fastestPlayer.ans!.timeTakenMs)})</span>
                                                                    </div>
                                                                )}
                                                                {qAvgTime !== undefined && (
                                                                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                                        <Clock size={14} className="text-blue-500" />
                                                                        <span>Ortalama: <strong className="text-[var(--text-primary)]">{formatMs(qAvgTime)}</strong></span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                                    <Target size={14} className="text-green-500" />
                                                                    <span>Doğruluk: <strong className="text-[var(--text-primary)]">%{q.correctRate}</strong></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Players Tab ── */}
                        {activeTab === "players" && (
                            <div className="space-y-4">
                                {[...selectedGame.players_data].sort((a, b) => a.finalRank - b.finalRank).map((player, i) => {
                                    const times = player.answers.filter(a => a.timeTakenMs !== undefined).map(a => a.timeTakenMs!);
                                    const avgTime = times.length ? avg(times) : undefined;
                                    const accuracyPct = player.answers.length > 0 ? Math.round((player.correctCount / player.answers.length) * 100) : 0;
                                    const bestQTime = times.length ? Math.min(...times) : undefined;

                                    return (
                                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-2xl p-5">
                                            {/* Player header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${player.finalRank === 1 ? "bg-yellow-400 text-yellow-900" : player.finalRank === 2 ? "bg-gray-300 text-gray-800" : player.finalRank === 3 ? "bg-orange-400 text-orange-900" : "bg-[var(--input-bg)] text-[var(--text-secondary)]"}`}>
                                                        {player.finalRank}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-lg">{player.name}</div>
                                                        <div className="text-sm text-[var(--text-secondary)]">
                                                            {player.correctCount} doğru · {player.wrongCount} yanlış
                                                            {player.streak >= 3 && <span className="ml-2 text-orange-400">🔥 {player.streak} seri</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{player.score}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">puan</div>
                                                </div>
                                            </div>

                                            {/* Stats mini grid */}
                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                <div className="bg-[var(--input-bg)] rounded-xl px-3 py-2 text-center">
                                                    <div className="text-xs text-[var(--text-secondary)] mb-0.5">Doğruluk</div>
                                                    <div className={`font-black text-lg ${accuracyPct >= 60 ? "text-green-500" : accuracyPct >= 40 ? "text-yellow-500" : "text-red-500"}`}>%{accuracyPct}</div>
                                                </div>
                                                <div className="bg-[var(--input-bg)] rounded-xl px-3 py-2 text-center">
                                                    <div className="text-xs text-[var(--text-secondary)] mb-0.5">Ort. Süre</div>
                                                    <div className="font-black text-lg text-blue-500">{formatMs(avgTime)}</div>
                                                </div>
                                                <div className="bg-[var(--input-bg)] rounded-xl px-3 py-2 text-center">
                                                    <div className="text-xs text-[var(--text-secondary)] mb-0.5">En Hızlı</div>
                                                    <div className="font-black text-lg text-purple-500">{formatMs(bestQTime)}</div>
                                                </div>
                                            </div>

                                            {/* Per-question row */}
                                            <div className="flex gap-1.5 flex-wrap">
                                                {selectedGame.questions_data.map((_, qi) => {
                                                    const ans = player.answers.find(a => a.questionIndex === qi);
                                                    if (!ans) return (
                                                        <div key={qi} className="w-9 h-9 rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-xs text-[var(--text-secondary)] font-bold">—</div>
                                                    );
                                                    return (
                                                        <div key={qi} title={`Q${qi + 1}: ${ans.correct ? `+${ans.pointsEarned}` : "Yanlış"} (${formatMs(ans.timeTakenMs)})`}
                                                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black text-white ${ans.correct ? "bg-green-500" : "bg-red-500/70"}`}>
                                                            {ans.correct ? `+${ans.pointsEarned >= 1000 ? "1k" : ans.pointsEarned}` : "✗"}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
