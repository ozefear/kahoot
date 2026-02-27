import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ES Modülleri için __dirname tanımlaması (Render için gerekli)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Veritabanı yolunu güvenli hale getirdik
const db = new Database(path.join(__dirname, "kahoot.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS question_sets (
    id TEXT PRIMARY KEY,
    host_nickname TEXT,
    title TEXT,
    questions TEXT
  )
`);

// Types
type Question = {
  id: string;
  title: string;
  image?: string;
  options: string[];
  correctOptionIndex: number;
  timeLimit: number;
};

type Player = {
  id: string; // socket id
  name: string;
  score: number;
  currentAnswerIndex?: number;
  answeredAt?: number; // timestamp
  streak: number;
  isConnected?: boolean;
  lastResult?: any;
};

type GameState = {
  pin: string;
  hostSocketId: string;
  status: "lobby" | "question" | "leaderboard" | "finished";
  questions: Question[];
  currentQuestionIndex: number;
  players: Player[];
  questionStartTime?: number;
  timer?: NodeJS.Timeout;
  lastResultData?: any;
};

const games = new Map<string, GameState>();

async function startServer() {
  const app = express();
  // Render.com'un atadığı portu kullanması için güncellendi
  const PORT = process.env.PORT || 3000; 
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // API routes
  app.use(express.json());

  // SES DOSYALARI İÇİN STATİK ROTA (Render'da lobby.mp3 çalışması için eklendi)
  const publicPath = path.join(__dirname, "public");
  app.use('/audio', express.static(path.join(publicPath, 'audio')));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("save_set", (data: { hostNickname: string; title: string; questions: Question[] }, callback) => {
      try {
        const id = uuidv4();
        const stmt = db.prepare('INSERT INTO question_sets (id, host_nickname, title, questions) VALUES (?, ?, ?, ?)');
        stmt.run(id, data.hostNickname, data.title, JSON.stringify(data.questions));
        callback({ success: true, id });
      } catch (e) {
        callback({ error: "Kaydetme başarısız" });
      }
    });

    socket.on("load_sets", (data: { hostNickname: string }, callback) => {
      try {
        const stmt = db.prepare('SELECT id, title, questions FROM question_sets WHERE host_nickname = ?');
        const rows = stmt.all(data.hostNickname) as any[];
        const sets = rows.map(r => ({ ...r, questions: JSON.parse(r.questions) }));
        callback({ success: true, sets });
      } catch (e) {
        callback({ error: "Yükleme başarısız" });
      }
    });

    socket.on("rejoin_host", (data: { pin: string }, callback) => {
      const game = games.get(data.pin);
      if (game) {
        game.hostSocketId = socket.id;
        socket.join(data.pin);
        const { timer, ...safeGame } = game;
        callback({ success: true, game: safeGame });
      } else {
        callback({ error: "Oyun bulunamadı" });
      }
    });

    socket.on("rejoin_player", (data: { pin: string; name: string }, callback) => {
      const game = games.get(data.pin);
      if (game) {
        const player = game.players.find(p => p.name === data.name);
        if (player) {
          player.id = socket.id;
          player.isConnected = true;
          socket.join(data.pin);
          const { timer, ...safeGame } = game;
          
          // Notify host they are back
          io.to(game.hostSocketId).emit("player_joined", player);
          
          callback({ success: true, game: safeGame, player });
        } else {
          callback({ error: "Oyuncu bulunamadı" });
        }
      } else {
        callback({ error: "Oyun bulunamadı" });
      }
    });

    // Host creates a game
    socket.on("host_create_game", (data: { questions: Question[] }, callback) => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const gameState: GameState = {
        pin,
        hostSocketId: socket.id,
        status: "lobby",
        questions: data.questions,
        currentQuestionIndex: 0,
        players: [],
      };
      games.set(pin, gameState);
      socket.join(pin);
      callback({ pin });
      console.log(`Game created with PIN: ${pin}`);
    });

    // Player joins a game
    socket.on("player_join", (data: { pin: string; name: string }, callback) => {
      const game = games.get(data.pin);
      if (!game) {
        return callback({ error: "Oyun bulunamadı" });
      }
      if (game.status !== "lobby") {
        return callback({ error: "Oyun zaten başladı" });
      }
      
      const newPlayer: Player = {
        id: socket.id,
        name: data.name,
        score: 0,
        streak: 0,
        isConnected: true,
      };
      game.players.push(newPlayer);
      socket.join(data.pin);
      
      // Notify host
      io.to(game.hostSocketId).emit("player_joined", newPlayer);
      callback({ success: true, player: newPlayer });
    });

    // Host starts the game
    socket.on("host_start_game", (data: { pin: string }) => {
      const game = games.get(data.pin);
      if (game && game.hostSocketId === socket.id) {
        startGameLoop(game, io);
      }
    });

    // Player submits an answer
    socket.on("player_answer", (data: { pin: string; answerIndex: number }) => {
      const game = games.get(data.pin);
      if (game && game.status === "question") {
        const player = game.players.find((p) => p.id === socket.id);
        if (player && player.currentAnswerIndex === undefined) {
          player.currentAnswerIndex = data.answerIndex;
          player.answeredAt = Date.now();
          
          // Notify host that a player answered
          io.to(game.hostSocketId).emit("player_answered", { playerId: player.id });

          // Check if all connected players answered
          const connectedPlayers = game.players.filter(p => p.isConnected);
          const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every((p) => p.currentAnswerIndex !== undefined);
          if (allAnswered && game.timer) {
            clearTimeout(game.timer);
            endQuestion(game, io);
          }
        }
      }
    });

    // Host requests next step (leaderboard or next question)
    socket.on("host_next_step", (data: { pin: string }) => {
      const game = games.get(data.pin);
      if (game && game.hostSocketId === socket.id) {
        if (game.status === "question") {
          if (game.timer) clearTimeout(game.timer);
          endQuestion(game, io);
        } else if (game.status === "leaderboard") {
          game.currentQuestionIndex++;
          if (game.currentQuestionIndex < game.questions.length) {
            startGameLoop(game, io);
          } else {
            game.status = "finished";
            io.to(game.pin).emit("game_over", {
              leaderboard: getLeaderboard(game),
            });
          }
        }
      }
    });

    socket.on("disconnect", () => {
      // Find if player was in any game
      for (const [pin, game] of games.entries()) {
        if (game.hostSocketId === socket.id) {
          // Host disconnected, don't delete game immediately so they can rejoin
          io.to(pin).emit("host_disconnected");
        } else {
          const playerIndex = game.players.findIndex((p) => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = game.players[playerIndex];
            player.isConnected = false;
            // Don't remove player so they can rejoin
            io.to(game.hostSocketId).emit("player_left", { playerId: player.id });
            
            // If they disconnected during a question, check if we should end it
            if (game.status === "question") {
              const connectedPlayers = game.players.filter(p => p.isConnected);
              const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every((p) => p.currentAnswerIndex !== undefined);
              if (allAnswered && game.timer) {
                clearTimeout(game.timer);
                endQuestion(game, io);
              }
            }
          }
        }
      }
    });
  });

  function startGameLoop(game: GameState, io: Server) {
    game.status = "question";
    const currentQuestion = game.questions[game.currentQuestionIndex];
    
    // Reset player answers
    game.players.forEach((p) => {
      p.currentAnswerIndex = undefined;
      p.answeredAt = undefined;
    });

    game.questionStartTime = Date.now();

    // Send question to host and players
    io.to(game.hostSocketId).emit("new_question", {
      question: currentQuestion,
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
    });

    // Players don't get the correct answer or title/image, just options count/colors
    // But for simplicity, let's send them the whole question without correctOptionIndex
    const playerQuestion = {
      title: currentQuestion.title,
      image: currentQuestion.image,
      options: currentQuestion.options,
      timeLimit: currentQuestion.timeLimit,
    };
    
    // Broadcast to players (excluding host)
    game.players.forEach((p) => {
      io.to(p.id).emit("new_question", { question: playerQuestion });
    });

    // Start timer
    game.timer = setTimeout(() => {
      endQuestion(game, io);
    }, currentQuestion.timeLimit * 1000);
  }

  function endQuestion(game: GameState, io: Server) {
    game.status = "leaderboard";
    const currentQuestion = game.questions[game.currentQuestionIndex];
    
    // Calculate previous ranks
    const prevLeaderboard = [...game.players].sort((a, b) => b.score - a.score);
    const prevRanks = new Map(prevLeaderboard.map((p, i) => [p.id, i + 1]));

    // Calculate scores
    game.players.forEach((p) => {
      const prevScore = p.score;
      if (p.currentAnswerIndex === currentQuestion.correctOptionIndex) {
        // Base score + time bonus
        const timeTaken = p.answeredAt ? p.answeredAt - (game.questionStartTime || 0) : currentQuestion.timeLimit * 1000;
        const timeRatio = Math.max(0, 1 - timeTaken / (currentQuestion.timeLimit * 1000));
        const points = Math.round(500 + 500 * timeRatio);
        p.score += points;
        p.streak = (p.streak || 0) + 1;
      } else {
        p.streak = 0;
      }
      
      // Send results to players
      p.lastResult = {
        correct: p.currentAnswerIndex === currentQuestion.correctOptionIndex,
        correctOptionIndex: currentQuestion.correctOptionIndex,
        score: p.score,
        pointsEarned: p.score - prevScore,
        streak: p.streak,
      };
      io.to(p.id).emit("question_result", p.lastResult);
    });

    const newLeaderboard = [...game.players].sort((a, b) => b.score - a.score);
    const newRanks = new Map(newLeaderboard.map((p, i) => [p.id, i + 1]));
    
    const rankChanges = game.players.map(p => {
      const prev = prevRanks.get(p.id) || 0;
      const curr = newRanks.get(p.id) || 0;
      return { name: p.name, change: prev - curr, newRank: curr };
    }).filter(p => p.change > 0).sort((a, b) => b.change - a.change);

    const highestClimber = rankChanges.length > 0 ? rankChanges[0] : null;

    // Send results to host
    const answerCounts = [0, 0, 0, 0];
    game.players.forEach((p) => {
      if (p.currentAnswerIndex !== undefined) {
        answerCounts[p.currentAnswerIndex]++;
      }
    });

    const resultData = {
      correctOptionIndex: currentQuestion.correctOptionIndex,
      answerCounts,
      leaderboard: getLeaderboard(game),
      highestClimber,
    };
    game.lastResultData = resultData;

    io.to(game.hostSocketId).emit("question_result", resultData);
  }

  function getLeaderboard(game: GameState) {
    return [...game.players].sort((a, b) => b.score - a.score).slice(0, 3);
  }

  // Vite middleware for development ve Render.com statik dosya yolları
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.resolve(__dirname, "dist/index.html"));
  
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Render.com için Production ayarları güncellendi
    app.use(express.static(path.join(__dirname, "dist")));

      // MOBİL DEBUG RADARI
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

  // 0.0.0.0 Render.com dışa açılımı için zorunludur
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
