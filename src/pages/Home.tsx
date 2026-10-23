import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { socket } from "../socket";
import { Sparkles, AlertCircle } from "lucide-react";

export default function Home() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const wasKicked = location.state?.kicked === true;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !name) return;

    socket.emit("player_join", { pin, name }, (response: any) => {
      if (response.error) {
        setError(response.error);
      } else {
        // Mid-game join: navigate directly to game if already started
        if (response.gameStatus && response.gameStatus !== "lobby") {
          navigate(`/player/game/${pin}`, {
            state: {
              name,
              theme: response.theme || "sitcom",
              hostNickname: response.hostNickname,
              title: response.title,
            },
          });
        } else {
          navigate(`/player/lobby/${pin}`, {
            state: {
              name,
              theme: response.theme || "sitcom",
              hostNickname: response.hostNickname,
              title: response.title,
              players: response.players,
            },
          });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 selection:bg-purple-500/30">
      {/* Kicked banner */}
      {wasKicked && (
        <div className="w-full max-w-md mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-2xl px-5 py-4 font-bold">
          <AlertCircle size={20} className="flex-shrink-0" />
          Oyundan atıldınız.
        </div>
      )}

      <div className="w-full max-w-md bg-[var(--color-quiz-card)] border-2 border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/30 flex items-center justify-center border border-purple-400/40 mb-4 shadow-[0_0_25px_rgba(168,85,247,0.35)]">
            <Sparkles className="w-8 h-8 text-purple-300" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-center text-white tracking-tight drop-shadow-md">
            Hacettepe Kahoot
          </h1>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Oyun PIN'i"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-xl md:text-2xl font-black p-4 bg-white/10 border-2 border-white/20 rounded-2xl focus:border-purple-400 focus:bg-white/15 text-white placeholder-slate-400 transition-all outline-none shadow-inner"
              maxLength={6}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-center text-xl md:text-2xl font-black p-4 bg-white/10 border-2 border-white/20 rounded-2xl focus:border-purple-400 focus:bg-white/15 text-white placeholder-slate-400 transition-all outline-none shadow-inner"
              maxLength={15}
            />
          </div>

          {error && <p className="text-red-300 text-center font-bold bg-red-500/20 py-2.5 rounded-xl border border-red-500/30 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!pin || !name}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xl p-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] mt-4 active:scale-[0.99] cursor-pointer"
          >
            Oyuna Katıl
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/15 text-center">
          <p className="text-slate-300 mb-3 font-bold text-base">Yarışma oluşturmak mı istiyorsunuz?</p>
          <button
            onClick={() => navigate("/host/create")}
            className="text-purple-300 hover:text-white font-black text-lg transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            Yarışma Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
