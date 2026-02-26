import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Plus, Trash2, Image as ImageIcon, Save, Menu, X, FolderOpen, Play, Sparkles } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { SHAPES } from "../components/Shapes";

type Question = {
  id: string;
  title: string;
  image?: string;
  options: string[];
  correctOptionIndex: number;
  timeLimit: number;
};

export default function HostCreate() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uuidv4(),
      title: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      timeLimit: 20,
    },
  ]);
  const [activeQuestionId, setActiveQuestionId] = useState(questions[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [hostNickname, setHostNickname] = useState("");
  const [setTitle, setSetTitle] = useState("");
  const [savedSets, setSavedSets] = useState<any[]>([]);

  const activeQuestionIndex = questions.findIndex((q) => q.id === activeQuestionId);
  const activeQuestion = questions[activeQuestionIndex];

  const updateActiveQuestion = (updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[activeQuestionIndex] = { ...activeQuestion, ...updates };
    setQuestions(newQuestions);
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      title: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      timeLimit: 20,
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
    setSidebarOpen(false);
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((q) => q.id !== id);
    setQuestions(newQuestions);
    if (activeQuestionId === id) {
      setActiveQuestionId(newQuestions[0].id);
    }
  };

  const handleCreateLobby = () => {
    // Validate
    const isValid = questions.every(
      (q) => q.title.trim() && q.options.every((opt) => opt.trim())
    );
    if (!isValid) {
      alert("Lütfen tüm soru başlıklarını ve seçenekleri doldurun.");
      return;
    }

    socket.emit("host_create_game", { questions }, (response: any) => {
      if (response.pin) {
        navigate(`/host/lobby/${response.pin}`);
      }
    });
  };

  const handleSaveSet = () => {
    if (!hostNickname || !setTitle) return alert("Lütfen takma ad ve başlık girin");
    socket.emit("save_set", { hostNickname, title: setTitle, questions }, (res: any) => {
      if (res.success) {
        alert("Başarıyla kaydedildi!");
        setShowSaveModal(false);
      } else {
        alert("Kaydetme başarısız");
      }
    });
  };

  const handleLoadSets = () => {
    if (!hostNickname) return alert("Lütfen takma ad girin");
    socket.emit("load_sets", { hostNickname }, (res: any) => {
      if (res.success) {
        setSavedSets(res.sets);
      }
    });
  };

  const loadSpecificSet = (questionsJson: any) => {
    setQuestions(questionsJson);
    setActiveQuestionId(questionsJson[0].id);
    setShowLoadModal(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-white selection:bg-violet-500/30">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-white/5 bg-black/20 backdrop-blur-md z-20 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-violet-600/20 flex items-center justify-center border border-violet-500/30 hidden sm:flex">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-violet-400" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Oyun Kur</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setShowLoadModal(true)}
            className="bg-white/5 border border-white/10 text-gray-300 px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-white/10 hover:text-white flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            <FolderOpen size={20} />
            <span className="hidden sm:inline">Yükle</span>
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="bg-white/5 border border-white/10 text-gray-300 px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-white/10 hover:text-white flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            <Save size={20} />
            <span className="hidden sm:inline">Kaydet</span>
          </button>
          <button
            onClick={handleCreateLobby}
            className="bg-violet-500 text-white px-4 md:px-6 py-2 rounded-lg font-bold hover:bg-violet-600 flex items-center gap-2 text-sm md:text-base shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all"
          >
            <Play size={20} />
            <span className="hidden sm:inline">Lobi Oluştur</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className={`
          absolute md:relative z-10 w-64 h-full bg-[var(--color-quiz-card)] border-r border-white/5 overflow-y-auto p-4 flex flex-col gap-4
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {questions.map((q, index) => (
            <div
              key={q.id}
              onClick={() => {
                setActiveQuestionId(q.id);
                setSidebarOpen(false);
              }}
              className={`p-4 rounded-xl border cursor-pointer relative group transition-colors ${
                activeQuestionId === q.id
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 hover:border-white/20 bg-white/5"
              }`}
            >
              <div className="font-bold text-gray-400 mb-2 text-sm">Soru {index + 1}</div>
              <div className="text-sm truncate text-gray-200">
                {q.title || "Boş soru"}
              </div>
              {questions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuestion(q.id);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddQuestion}
            className="p-4 rounded-xl border-2 border-dashed border-white/20 text-gray-400 font-bold hover:border-violet-500 hover:text-violet-400 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} /> Soru Ekle
          </button>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/50 z-0 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            <input
              type="text"
              placeholder="Sorunuzu yazmaya başlayın"
              value={activeQuestion.title}
              onChange={(e) => updateActiveQuestion({ title: e.target.value })}
              className="w-full text-center text-2xl md:text-4xl font-bold p-4 md:p-6 bg-[var(--color-quiz-card)] text-white placeholder-gray-500 rounded-2xl shadow-sm border border-white/10 focus:border-violet-500 outline-none transition-colors"
            />

            <div className="flex flex-col md:flex-row justify-center gap-4">
              <div className="w-full md:w-96 h-48 md:h-64 bg-[var(--color-quiz-card)] rounded-2xl shadow-sm border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-gray-400 p-4 relative overflow-hidden transition-colors hover:border-white/30">
                {activeQuestion.image ? (
                  <>
                    <img
                      src={activeQuestion.image}
                      alt="Question"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      onClick={() => updateActiveQuestion({ image: undefined })}
                      className="absolute top-2 right-2 bg-black/50 backdrop-blur-md p-2 rounded-full text-red-400 hover:bg-black/70 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon size={48} className="mb-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Görsel URL (isteğe bağlı)"
                      className="w-full text-center p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-violet-500 text-sm md:text-base text-white placeholder-gray-500 transition-colors"
                      value={activeQuestion.image || ""}
                      onChange={(e) => updateActiveQuestion({ image: e.target.value })}
                    />
                  </>
                )}
              </div>
              
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="bg-[var(--color-quiz-card)] p-4 rounded-2xl shadow-sm border border-white/10">
                  <label className="block text-sm font-bold text-gray-400 mb-2">
                    Süre sınırı
                  </label>
                  <select
                    value={activeQuestion.timeLimit}
                    onChange={(e) =>
                      updateActiveQuestion({ timeLimit: Number(e.target.value) })
                    }
                    className="w-full p-2 bg-white/5 border border-white/10 text-white rounded-lg outline-none focus:border-violet-500 font-medium transition-colors"
                  >
                    <option value={10} className="bg-gray-900">10 saniye</option>
                    <option value={20} className="bg-gray-900">20 saniye</option>
                    <option value={30} className="bg-gray-900">30 saniye</option>
                    <option value={60} className="bg-gray-900">1 dakika</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeQuestion.options.map((opt, index) => {
                const colors = [
                  "bg-red-500",
                  "bg-blue-500",
                  "bg-yellow-500",
                  "bg-green-500",
                ];
                const Shape = SHAPES[index];
                return (
                  <div
                    key={index}
                    className={`relative p-4 md:p-6 rounded-2xl shadow-sm flex items-center gap-3 md:gap-4 transition-colors ${colors[index]}`}
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 text-white flex items-center justify-center">
                      <Shape className="w-full h-full drop-shadow-md" />
                    </div>
                    <input
                      type="text"
                      placeholder={`Cevap ${index + 1} ekle`}
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...activeQuestion.options];
                        newOptions[index] = e.target.value;
                        updateActiveQuestion({ options: newOptions });
                      }}
                      className="w-full bg-transparent text-white placeholder-white/70 text-lg md:text-xl font-bold outline-none drop-shadow-sm"
                    />
                    <div
                      onClick={() =>
                        updateActiveQuestion({ correctOptionIndex: index })
                      }
                      className={`w-8 h-8 rounded-full border-4 cursor-pointer flex-shrink-0 flex items-center justify-center bg-black/20 ml-2 transition-colors ${
                        activeQuestion.correctOptionIndex === index
                          ? "border-white bg-white/20"
                          : "border-white/30 hover:border-white/60"
                      }`}
                    >
                      {activeQuestion.correctOptionIndex === index && (
                        <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showSaveModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Soru Setini Kaydet</h2>
            <input
              type="text"
              placeholder="Kurucu Takma Adınız"
              value={hostNickname}
              onChange={e => setHostNickname(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl mb-4 outline-none focus:border-violet-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Set Başlığı (örn. Tarih Testi)"
              value={setTitle}
              onChange={e => setSetTitle(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl mb-8 outline-none focus:border-violet-500 transition-colors"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSaveModal(false)} className="px-5 py-2.5 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">İptal</button>
              <button onClick={handleSaveSet} className="px-5 py-2.5 font-bold bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)]">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-white">Soru Seti Yükle</h2>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Kurucu Takma Adınız"
                value={hostNickname}
                onChange={e => setHostNickname(e.target.value)}
                className="flex-1 p-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl outline-none focus:border-violet-500 transition-colors"
              />
              <button onClick={handleLoadSets} className="px-5 py-2.5 font-bold bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)]">Bul</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {savedSets.map(set => (
                <div key={set.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors">
                  <span className="font-bold text-gray-200">{set.title}</span>
                  <button onClick={() => loadSpecificSet(set.questions)} className="text-violet-400 font-bold hover:text-violet-300 transition-colors">Yükle</button>
                </div>
              ))}
              {savedSets.length === 0 && <p className="text-gray-500 text-center py-8 font-medium">Set bulunamadı.</p>}
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
              <button onClick={() => setShowLoadModal(false)} className="px-5 py-2.5 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
