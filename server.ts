import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";

const db = new Database("kahoot.db");
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
};

const games = new Map<string, GameState>();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // API routes
  app.use(express.json());
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
        callback({ error: "Failed to save" });
      }
    });

    socket.on("load_sets", (data: { hostNickname: string }, callback) => {
      try {
        const stmt = db.prepare('SELECT id, title, questions FROM question_sets WHERE host_nickname = ?');
        const rows = stmt.all(data.hostNickname) as any[];
        const sets = rows.map(r => ({ ...r, questions: JSON.parse(r.questions) }));
        callback({ success: true, sets });
      } catch (e) {
        callback({ error: "Failed to load" });
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
        return callback({ error: "Game not found" });
      }
      if (game.status !== "lobby") {
        return callback({ error: "Game already started" });
      }
      
      const newPlayer: Player = {
        id: socket.id,
        name: data.name,
        score: 0,
        streak: 0,
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

          // Check if all players answered
          const allAnswered = game.players.every((p) => p.currentAnswerIndex !== undefined);
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
          // Should not happen normally as endQuestion handles it, but just in case
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
          // Host disconnected, end game
          io.to(pin).emit("host_disconnected");
          games.delete(pin);
        } else {
          const playerIndex = game.players.findIndex((p) => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = game.players[playerIndex];
            game.players.splice(playerIndex, 1);
            io.to(game.hostSocketId).emit("player_left", { playerId: player.id });
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
      io.to(p.id).emit("question_result", {
        correct: p.currentAnswerIndex === currentQuestion.correctOptionIndex,
        correctOptionIndex: currentQuestion.correctOptionIndex,
        score: p.score,
        pointsEarned: p.score - prevScore,
        streak: p.streak,
      });
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

    io.to(game.hostSocketId).emit("question_result", {
      correctOptionIndex: currentQuestion.correctOptionIndex,
      answerCounts,
      leaderboard: getLeaderboard(game),
      highestClimber,
    });
  }

  function getLeaderboard(game: GameState) {
    return [...game.players].sort((a, b) => b.score - a.score).slice(0, 3);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
