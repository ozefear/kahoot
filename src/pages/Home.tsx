import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { socket } from "../socket";

import { Sparkles } from "lucide-react";

export default function Home() {
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !name) return;

    socket.emit("player_join", { pin, name }, (response: any) => {
      if (response.error) {
        setError(response.error);
      } else {
        navigate(`/player/lobby/${pin}`, { state: { name } });
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col items-center justify-center p-4 selection:bg-purple-500/30">
      <div className="w-full max-w-md bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500"></div>
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-8 h-8 text-purple-500 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-center text-[var(--text-primary)] tracking-tight">
            ACM Hacettepe
          </h1>
        </div>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Oyun PIN'i"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-xl md:text-2xl font-bold p-4 bg-[var(--input-bg)] border-2 border-[var(--border-color)] rounded-2xl focus:border-purple-500 focus:bg-[var(--input-focus)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-all outline-none"
              maxLength={6}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-center text-xl md:text-2xl font-bold p-4 bg-[var(--input-bg)] border-2 border-[var(--border-color)] rounded-2xl focus:border-purple-500 focus:bg-[var(--input-focus)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-all outline-none"
              maxLength={15}
            />
          </div>
          
          {error && <p className="text-red-500 dark:text-red-400 text-center font-medium bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
          
          <button
            type="submit"
            disabled={!pin || !name}
            className="w-full bg-purple-600 text-white font-bold text-xl p-4 rounded-2xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] mt-4"
          >
            Oyuna Katıl
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-[var(--border-color)] text-center">
          <p className="text-[var(--text-secondary)] mb-4 font-medium">Yarışma oluşturmak mı istiyorsunuz?</p>
          <button
            onClick={() => navigate("/host/create")}
            className="text-[var(--text-primary)] font-bold hover:text-purple-500 dark:hover:text-purple-400 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            Yarışma Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
