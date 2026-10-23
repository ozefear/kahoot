import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, "kahoot.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS question_sets (
    id TEXT PRIMARY KEY,
    host_nickname TEXT,
    title TEXT,
    questions TEXT
  );
  CREATE TABLE IF NOT EXISTS game_results (
    id TEXT PRIMARY KEY,
    pin TEXT,
    host_nickname TEXT,
    title TEXT,
    date TEXT,
    total_players INTEGER,
    questions_data TEXT,
    players_data TEXT,
    leaderboard TEXT
  );
`);
const games = new Map();
async function startServer() {
    const app = express();
    const PORT = process.env.PORT || 3000;
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: { origin: "*" },
    });
    app.use(express.json());
    const publicPath = path.join(__dirname, "public");
    app.use('/audio', express.static(path.join(publicPath, 'audio')));
    app.get("/api/health", (req, res) => {
        res.json({ status: "ok" });
    });
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
        // ── Question Sets ────────────────────────────────────────────────────────
        socket.on("save_set", (data, callback) => {
            try {
                const id = uuidv4();
                const stmt = db.prepare('INSERT INTO question_sets (id, host_nickname, title, questions) VALUES (?, ?, ?, ?)');
                stmt.run(id, data.hostNickname, data.title, JSON.stringify(data.questions));
                callback({ success: true, id });
            }
            catch (e) {
                callback({ error: "Kaydetme başarısız" });
            }
        });
        socket.on("load_sets", (data, callback) => {
            try {
                const stmt = db.prepare('SELECT id, title, questions FROM question_sets WHERE host_nickname = ?');
                const rows = stmt.all(data.hostNickname);
                const sets = rows.map(r => ({ ...r, questions: JSON.parse(r.questions) }));
                callback({ success: true, sets });
            }
            catch (e) {
                callback({ error: "Yükleme başarısız" });
            }
        });
        // ── Game Results ─────────────────────────────────────────────────────────
        socket.on("get_game_results", (data, callback) => {
            try {
                const stmt = db.prepare('SELECT id, pin, title, date, total_players FROM game_results WHERE host_nickname = ? ORDER BY date DESC');
                const rows = stmt.all(data.hostNickname);
                callback({ success: true, results: rows });
            }
            catch (e) {
                callback({ error: "Sonuçlar alınamadı" });
            }
        });
        socket.on("get_game_detail", (data, callback) => {
            try {
                const stmt = db.prepare('SELECT * FROM game_results WHERE id = ?');
                const row = stmt.get(data.id);
                if (!row)
                    return callback({ error: "Bulunamadı" });
                callback({
                    success: true,
                    result: {
                        ...row,
                        questions_data: JSON.parse(row.questions_data),
                        players_data: JSON.parse(row.players_data),
                        leaderboard: JSON.parse(row.leaderboard),
                    }
                });
            }
            catch (e) {
                callback({ error: "Detay alınamadı" });
            }
        });
        // ── Host Rejoin ──────────────────────────────────────────────────────────
        socket.on("rejoin_host", (data, callback) => {
            const game = games.get(data.pin);
            if (game) {
                game.hostSocketId = socket.id;
                socket.join(data.pin);
                const { timer, questionInterval, ...safeGame } = game;
                let remainingTime = undefined;
                if (game.status === "question" && game.questionStartTime) {
                    const elapsed = Math.floor((Date.now() - game.questionStartTime) / 1000);
                    const currentQuestion = game.questions[game.currentQuestionIndex];
                    remainingTime = Math.max(0, currentQuestion.timeLimit - elapsed);
                }
                io.to(data.pin).emit("host_reconnected");
                callback({ success: true, game: safeGame, hostNickname: game.hostNickname, remainingTime, theme: game.theme || "sitcom" });
            }
            else {
                callback({ error: "Oyun bulunamadı" });
            }
        });
        // ── Player Rejoin ────────────────────────────────────────────────────────
        socket.on("rejoin_player", (data, callback) => {
            const game = games.get(data.pin);
            if (game) {
                const player = game.players.find(p => p.name === data.name);
                if (player) {
                    player.id = socket.id;
                    player.isConnected = true;
                    socket.join(data.pin);
                    const { timer, questionInterval, ...safeGame } = game;
                    let remainingTime = undefined;
                    if (game.status === "question" && game.questionStartTime) {
                        const elapsed = Math.floor((Date.now() - game.questionStartTime) / 1000);
                        const currentQuestion = game.questions[game.currentQuestionIndex];
                        remainingTime = Math.max(0, currentQuestion.timeLimit - elapsed);
                    }
                    let leaderboard = undefined;
                    if (game.status === "finished") {
                        leaderboard = getLeaderboard(game);
                    }
                    io.to(game.hostSocketId).emit("player_joined", player);
                    io.to(game.pin).emit("lobby_players_updated", {
                        players: game.players.filter(p => p.isConnected).map(p => ({ id: p.id, name: p.name })),
                        hostNickname: game.hostNickname,
                        title: game.title,
                        theme: game.theme || "sitcom",
                    });
                    callback({
                        success: true,
                        game: safeGame,
                        player,
                        remainingTime,
                        leaderboard,
                        hostNickname: game.hostNickname,
                        title: game.title,
                        theme: game.theme || "sitcom",
                        players: game.players.filter(p => p.isConnected).map(p => ({ id: p.id, name: p.name })),
                        questionIndex: game.currentQuestionIndex,
                        totalQuestions: game.questions.length,
                    });
                }
                else {
                    callback({ error: "Oyuncu bulunamadı" });
                }
            }
            else {
                callback({ error: "Oyun bulunamadı" });
            }
        });
        // ── Host Creates Game ────────────────────────────────────────────────────
        socket.on("host_create_game", (data, callback) => {
            const pin = Math.floor(100000 + Math.random() * 900000).toString();
            const adminName = data.hostNickname?.trim() || "Admin";
            const selectedTheme = data.theme || "sitcom";
            const gameState = {
                pin,
                hostSocketId: socket.id,
                hostNickname: adminName,
                title: data.title?.trim() || "Hacettepe Kahoot",
                theme: selectedTheme,
                status: "lobby",
                questions: data.questions,
                currentQuestionIndex: 0,
                players: [],
            };
            games.set(pin, gameState);
            socket.join(pin);
            callback({ pin, hostNickname: adminName, title: gameState.title, theme: selectedTheme });
            console.log(`Game created with PIN: ${pin} by Admin: ${adminName} [Theme: ${selectedTheme}]`);
        });
        // ── Host Updates Theme ───────────────────────────────────────────────────
        socket.on("host_update_theme", (data) => {
            const game = games.get(data.pin);
            if (game && game.hostSocketId === socket.id) {
                game.theme = data.theme;
                io.to(data.pin).emit("theme_updated", { theme: data.theme });
            }
        });
        // ── Player Joins ─────────────────────────────────────────────────────────
        socket.on("player_join", (data, callback) => {
            const game = games.get(data.pin);
            if (!game) {
                return callback({ error: "Oyun bulunamadı" });
            }
            // Check for duplicate name
            if (game.players.find(p => p.name === data.name && p.isConnected)) {
                return callback({ error: "Bu isim zaten kullanımda" });
            }
            const newPlayer = {
                id: socket.id,
                name: data.name,
                score: 0,
                streak: 0,
                isConnected: true,
                answerHistory: [],
            };
            game.players.push(newPlayer);
            socket.join(data.pin);
            io.to(game.hostSocketId).emit("player_joined", newPlayer);
            io.to(game.pin).emit("lobby_players_updated", {
                players: game.players.filter(p => p.isConnected).map(p => ({ id: p.id, name: p.name })),
                hostNickname: game.hostNickname,
                title: game.title,
                theme: game.theme || "sitcom",
            });
            // Mid-game late join: send them the current question immediately
            if (game.status === "question" && game.questionStartTime) {
                const currentQuestion = game.questions[game.currentQuestionIndex];
                const elapsed = Math.floor((Date.now() - game.questionStartTime) / 1000);
                const remainingTime = Math.max(0, currentQuestion.timeLimit - elapsed);
                const playerQuestion = {
                    title: currentQuestion.title,
                    image: currentQuestion.image,
                    options: currentQuestion.options,
                    timeLimit: currentQuestion.timeLimit,
                    remainingTime,
                };
                socket.emit("new_question", {
                    question: playerQuestion,
                    questionIndex: game.currentQuestionIndex,
                    totalQuestions: game.questions.length,
                });
                socket.emit("timer_tick", { timeLeft: remainingTime });
            }
            callback({
                success: true,
                player: newPlayer,
                gameStatus: game.status,
                hostNickname: game.hostNickname,
                title: game.title,
                theme: game.theme || "sitcom",
                players: game.players.filter(p => p.isConnected).map(p => ({ id: p.id, name: p.name })),
            });
        });
        // ── Kick Player ──────────────────────────────────────────────────────────
        socket.on("kick_player", (data, callback) => {
            const game = games.get(data.pin);
            if (!game || game.hostSocketId !== socket.id)
                return;
            const playerIndex = game.players.findIndex(p => p.name === data.name);
            if (playerIndex !== -1) {
                const player = game.players[playerIndex];
                // Tell the player they've been kicked
                io.to(player.id).emit("you_are_kicked");
                // Remove from game
                game.players.splice(playerIndex, 1);
                // Notify host UI
                io.to(game.hostSocketId).emit("player_left", { playerId: player.id });
                io.to(game.pin).emit("lobby_players_updated", {
                    players: game.players.filter(p => p.isConnected).map(p => ({ id: p.id, name: p.name })),
                    hostNickname: game.hostNickname,
                    title: game.title,
                    theme: game.theme || "sitcom",
                });
                // If they were answering a question, check if we should end it now
                if (game.status === "question") {
                    const connectedPlayers = game.players.filter(p => p.isConnected);
                    const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every(p => p.currentAnswerIndex !== undefined);
                    if (allAnswered && (game.timer || game.questionInterval)) {
                        clearGameTimers(game);
                        endQuestion(game, io);
                    }
                }
                if (callback)
                    callback({ success: true });
            }
        });
        // ── Host Starts Game ─────────────────────────────────────────────────────
        socket.on("host_start_game", (data) => {
            const game = games.get(data.pin);
            if (game && game.hostSocketId === socket.id) {
                startGameLoop(game, io);
            }
        });
        // ── Player Answers ───────────────────────────────────────────────────────
        socket.on("player_answer", (data) => {
            const game = games.get(data.pin);
            if (game && game.status === "question") {
                const player = game.players.find((p) => p.id === socket.id);
                if (player && player.currentAnswerIndex === undefined) {
                    player.currentAnswerIndex = data.answerIndex;
                    player.answeredAt = Date.now();
                    const connectedPlayers = game.players.filter(p => p.isConnected);
                    io.to(game.hostSocketId).emit("player_answered", {
                        playerId: player.id,
                        totalConnected: connectedPlayers.length,
                    });
                    // Check if all connected players answered
                    const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every((p) => p.currentAnswerIndex !== undefined);
                    if (allAnswered && (game.timer || game.questionInterval)) {
                        clearGameTimers(game);
                        endQuestion(game, io);
                    }
                }
            }
        });
        // ── Host Next Step ───────────────────────────────────────────────────────
        socket.on("host_next_step", (data) => {
            const game = games.get(data.pin);
            if (game && game.hostSocketId === socket.id) {
                if (game.status === "question") {
                    clearGameTimers(game);
                    endQuestion(game, io);
                }
                else if (game.status === "leaderboard") {
                    game.currentQuestionIndex++;
                    if (game.currentQuestionIndex < game.questions.length) {
                        startGameLoop(game, io);
                    }
                    else {
                        game.status = "finished";
                        const leaderboard = getLeaderboard(game);
                        const savedGameId = uuidv4();
                        // Auto-save game results (using pre-generated id so we can pass it to host)
                        saveGameResults(game, leaderboard, savedGameId);
                        io.to(game.pin).emit("game_over", { leaderboard });
                        // Tell only the host the saved game id so they can navigate to results
                        io.to(game.hostSocketId).emit("game_saved", { id: savedGameId });
                    }
                }
            }
        });
        // ── Disconnect ───────────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            for (const [pin, game] of games.entries()) {
                if (game.hostSocketId === socket.id) {
                    io.to(pin).emit("host_disconnected");
                }
                else {
                    const playerIndex = game.players.findIndex((p) => p.id === socket.id);
                    if (playerIndex !== -1) {
                        const player = game.players[playerIndex];
                        player.isConnected = false;
                        io.to(game.hostSocketId).emit("player_left", { playerId: player.id });
                        io.to(pin).emit("lobby_players_updated", {
                            players: game.players.filter(p => p.isConnected).map(p => ({ id: p.id, name: p.name })),
                            hostNickname: game.hostNickname,
                            title: game.title,
                            theme: game.theme || "sitcom",
                        });
                        if (game.status === "question") {
                            const connectedPlayers = game.players.filter(p => p.isConnected);
                            const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every((p) => p.currentAnswerIndex !== undefined);
                            if (allAnswered && (game.timer || game.questionInterval)) {
                                clearGameTimers(game);
                                endQuestion(game, io);
                            }
                        }
                    }
                }
            }
        });
    });
    // ── Game Loop ───────────────────────────────────────────────────────────────
    function clearGameTimers(game) {
        if (game.timer) {
            clearTimeout(game.timer);
            game.timer = undefined;
        }
        if (game.questionInterval) {
            clearInterval(game.questionInterval);
            game.questionInterval = undefined;
        }
    }
    function startGameLoop(game, io) {
        game.status = "question";
        const currentQuestion = game.questions[game.currentQuestionIndex];
        game.players.forEach((p) => {
            p.currentAnswerIndex = undefined;
            p.answeredAt = undefined;
        });
        game.questionStartTime = Date.now();
        const connectedPlayers = game.players.filter(p => p.isConnected);
        io.to(game.hostSocketId).emit("new_question", {
            question: currentQuestion,
            questionIndex: game.currentQuestionIndex,
            totalQuestions: game.questions.length,
            totalPlayers: connectedPlayers.length,
            theme: game.theme || "sitcom",
        });
        const playerQuestion = {
            title: currentQuestion.title,
            image: currentQuestion.image,
            options: currentQuestion.options,
            timeLimit: currentQuestion.timeLimit,
        };
        game.players.forEach((p) => {
            io.to(p.id).emit("new_question", {
                question: playerQuestion,
                questionIndex: game.currentQuestionIndex,
                totalQuestions: game.questions.length,
                theme: game.theme || "sitcom",
            });
        });
        clearGameTimers(game);
        let timeLeft = currentQuestion.timeLimit;
        io.to(game.pin).emit("timer_tick", { timeLeft });
        game.questionInterval = setInterval(() => {
            timeLeft--;
            const currentRemaining = Math.max(0, timeLeft);
            io.to(game.pin).emit("timer_tick", { timeLeft: currentRemaining });
            if (currentRemaining <= 0) {
                if (game.questionInterval) {
                    clearInterval(game.questionInterval);
                    game.questionInterval = undefined;
                }
            }
        }, 1000);
        game.timer = setTimeout(() => {
            clearGameTimers(game);
            endQuestion(game, io);
        }, currentQuestion.timeLimit * 1000);
    }
    function endQuestion(game, io) {
        clearGameTimers(game);
        io.to(game.pin).emit("timer_tick", { timeLeft: 0 });
        game.status = "leaderboard";
        const currentQuestion = game.questions[game.currentQuestionIndex];
        const prevLeaderboard = [...game.players].sort((a, b) => b.score - a.score);
        const prevRanks = new Map(prevLeaderboard.map((p, i) => [p.id, i + 1]));
        game.players.forEach((p) => {
            const prevScore = p.score;
            const isCorrect = p.currentAnswerIndex === currentQuestion.correctOptionIndex;
            let pointsEarned = 0;
            if (isCorrect) {
                const timeTaken = p.answeredAt ? p.answeredAt - (game.questionStartTime || 0) : currentQuestion.timeLimit * 1000;
                const timeRatio = Math.max(0, 1 - timeTaken / (currentQuestion.timeLimit * 1000));
                pointsEarned = Math.round(500 + 500 * timeRatio);
                p.score += pointsEarned;
                p.streak = (p.streak || 0) + 1;
            }
            else {
                p.streak = 0;
            }
            // Record answer history for saved results
            p.answerHistory.push({
                questionIndex: game.currentQuestionIndex,
                answerIndex: p.currentAnswerIndex,
                correct: isCorrect,
                pointsEarned,
                timeTakenMs: p.answeredAt ? p.answeredAt - (game.questionStartTime || 0) : undefined,
            });
            p.lastResult = {
                correct: isCorrect,
                correctOptionIndex: currentQuestion.correctOptionIndex,
                score: p.score,
                pointsEarned,
                streak: p.streak,
            };
        });
        // Calculate new ranks
        const newLeaderboard = [...game.players].sort((a, b) => b.score - a.score);
        const newRanks = new Map(newLeaderboard.map((p, i) => [p.id, i + 1]));
        // Send individual results to each player (including their rank)
        game.players.forEach((p) => {
            io.to(p.id).emit("question_result", {
                ...p.lastResult,
                rank: newRanks.get(p.id) || 0,
                totalPlayers: game.players.length,
            });
        });
        const rankChanges = game.players.map(p => {
            const prev = prevRanks.get(p.id) || 0;
            const curr = newRanks.get(p.id) || 0;
            return { name: p.name, change: prev - curr, newRank: curr, streak: p.streak };
        }).filter(p => p.change > 0).sort((a, b) => b.change - a.change);
        const highestClimber = rankChanges.length > 0 ? rankChanges[0] : null;
        const answerCounts = [0, 0, 0, 0];
        game.players.forEach((p) => {
            if (p.currentAnswerIndex !== undefined) {
                answerCounts[p.currentAnswerIndex]++;
            }
        });
        const leaderboardWithStreaks = newLeaderboard.slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            streak: p.streak,
        }));
        const resultData = {
            correctOptionIndex: currentQuestion.correctOptionIndex,
            answerCounts,
            leaderboard: leaderboardWithStreaks,
            highestClimber,
        };
        game.lastResultData = resultData;
        io.to(game.hostSocketId).emit("question_result", resultData);
    }
    function getLeaderboard(game) {
        return [...game.players].sort((a, b) => b.score - a.score).slice(0, 10).map((p, i) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            streak: p.streak,
            rank: i + 1,
        }));
    }
    function saveGameResults(game, leaderboard, id) {
        try {
            const questionsData = game.questions.map((q, qi) => {
                const answerCounts = [0, 0, 0, 0];
                let fastestMs;
                let correctCount = 0;
                game.players.forEach(p => {
                    const record = p.answerHistory.find(h => h.questionIndex === qi);
                    if (record) {
                        if (record.answerIndex !== undefined)
                            answerCounts[record.answerIndex]++;
                        if (record.correct) {
                            correctCount++;
                            if (record.timeTakenMs !== undefined && (fastestMs === undefined || record.timeTakenMs < fastestMs)) {
                                fastestMs = record.timeTakenMs;
                            }
                        }
                    }
                });
                return {
                    title: q.title,
                    options: q.options,
                    correctOptionIndex: q.correctOptionIndex,
                    answerCounts,
                    correctRate: game.players.length > 0 ? Math.round((correctCount / game.players.length) * 100) : 0,
                    fastestMs,
                };
            });
            const playersData = game.players.map((p, _) => {
                const rank = leaderboard.findIndex(l => l.name === p.name) + 1;
                return {
                    name: p.name,
                    score: p.score,
                    streak: p.streak,
                    finalRank: rank > 0 ? rank : game.players.length,
                    answers: p.answerHistory,
                    correctCount: p.answerHistory.filter(h => h.correct).length,
                    wrongCount: p.answerHistory.filter(h => !h.correct).length,
                };
            });
            const stmt = db.prepare('INSERT INTO game_results (id, pin, host_nickname, title, date, total_players, questions_data, players_data, leaderboard) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            stmt.run(id ?? uuidv4(), game.pin, game.hostNickname, game.title, new Date().toISOString(), game.players.length, JSON.stringify(questionsData), JSON.stringify(playersData), JSON.stringify(leaderboard));
            console.log(`Game results saved for PIN: ${game.pin}`);
        }
        catch (e) {
            console.error("Failed to save game results:", e);
        }
    }
    // ── Static / Vite ───────────────────────────────────────────────────────────
    app.use('/audio', express.static(path.join(__dirname, 'dist', 'audio')));
    app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));
    const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.resolve(__dirname, "dist/index.html"));
    if (!isProd) {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        app.use(express.static(path.join(__dirname, "dist")));
        app.get('/api/debug', (req, res) => {
            const distAudio = path.join(__dirname, 'dist', 'audio');
            const publicAudio = path.join(__dirname, 'public', 'audio');
            res.json({
                sunucuAnaDizini: __dirname,
                distKlasorundeAudioVarMi: fs.existsSync(distAudio),
                distDosyalari: fs.existsSync(distAudio) ? fs.readdirSync(distAudio) : "Klasör yok",
                publicKlasorundeAudioVarMi: fs.existsSync(publicAudio),
                publicDosyalari: fs.existsSync(publicAudio) ? fs.readdirSync(publicAudio) : "Klasör yok"
            });
        });
        app.get("*", (req, res) => {
            res.sendFile(path.join(__dirname, "dist/index.html"));
        });
    }
    httpServer.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}
startServer();
