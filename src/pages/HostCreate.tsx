import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Plus, Trash2, Image as ImageIcon, Save, Menu, X, FolderOpen, Play, Sparkles, Download, Upload, GripVertical, BarChart2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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

    // Save hostNickname for results page
    if (hostNickname) sessionStorage.setItem("hostNickname", hostNickname);

    socket.emit(
      "host_create_game",
      { questions, hostNickname: hostNickname || "unknown", title: setTitle || "Yarışma" },
      (response: any) => {
        if (response.pin) {
          navigate(`/host/lobby/${response.pin}`);
        }
      }
    );
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

  const handleDownloadSet = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "soru-seti.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleUploadSet = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].title !== undefined) {
          setQuestions(parsed);
          setActiveQuestionId(parsed[0].id);
        } else {
          alert("Geçersiz dosya formatı.");
        }
      } catch (err) {
        alert("Dosya okunamadı.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);
  };

  return (
    <div className="min-h-screen bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-[var(--border-color)] bg-[var(--color-quiz-bg)]/80 backdrop-blur-md z-20 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30 hidden sm:flex">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-purple-500 dark:text-purple-400" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Yarışma Oluştur</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <label className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-[var(--input-focus)] hover:text-[var(--text-primary)] flex items-center gap-2 text-sm md:text-base transition-colors cursor-pointer">
            <Upload size={20} />
            <span className="hidden sm:inline">İçe Aktar</span>
            <input type="file" accept=".json" onChange={handleUploadSet} className="hidden" />
          </label>
          <button
            onClick={handleDownloadSet}
            className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-[var(--input-focus)] hover:text-[var(--text-primary)] flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Dışa Aktar</span>
          </button>
          <button
            onClick={() => setShowLoadModal(true)}
            className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-[var(--input-focus)] hover:text-[var(--text-primary)] flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            <FolderOpen size={20} />
            <span className="hidden sm:inline">Yükle</span>
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-[var(--input-focus)] hover:text-[var(--text-primary)] flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            <Save size={20} />
            <span className="hidden sm:inline">Kaydet</span>
          </button>
          <button
            onClick={() => navigate("/host/results")}
            className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] px-3 md:px-4 py-2 rounded-lg font-bold hover:bg-[var(--input-focus)] hover:text-[var(--text-primary)] flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            <BarChart2 size={20} />
            <span className="hidden sm:inline">Sonuçlar</span>
          </button>
          <button
            onClick={handleCreateLobby}
            className="bg-purple-600 text-white px-4 md:px-6 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 text-sm md:text-base shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
          >
            <Play size={20} />
            <span className="hidden sm:inline">Odayı Kur</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className={`
          absolute md:relative z-10 w-64 h-full bg-[var(--color-quiz-card)] border-r border-[var(--border-color)] overflow-y-auto p-4 flex flex-col gap-4
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-4">
                  {questions.map((q, index) => (
                    <Draggable draggableId={q.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => {
                            setActiveQuestionId(q.id);
                            setSidebarOpen(false);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer relative group transition-colors ${activeQuestionId === q.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-[var(--border-color)] hover:border-purple-500/50 bg-[var(--input-bg)]"
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div {...provided.dragHandleProps} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing">
                              <GripVertical size={16} />
                            </div>
                            <div className="font-bold text-[var(--text-secondary)] text-sm">Soru {index + 1}</div>
                          </div>
                          <div className="text-sm truncate text-[var(--text-primary)] pl-6">
                            {q.title || "Boş soru"}
                          </div>
                          {questions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(q.id);
                              }}
                              className="absolute top-2 right-2 p-1 text-[var(--text-secondary)] hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <button
            onClick={handleAddQuestion}
            className="p-4 rounded-xl border-2 border-dashed border-[var(--border-color)] text-[var(--text-secondary)] font-bold hover:border-purple-500 hover:text-purple-500 dark:hover:text-purple-400 flex items-center justify-center gap-2 transition-colors"
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
              className="w-full text-center text-2xl md:text-4xl font-bold p-4 md:p-6 bg-[var(--color-quiz-card)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] focus:border-purple-500 outline-none transition-colors"
            />

            <div className="flex flex-col md:flex-row justify-center gap-4">
              <div className="w-full md:w-96 h-48 md:h-64 bg-[var(--color-quiz-card)] rounded-2xl shadow-sm border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-[var(--text-secondary)] p-4 relative overflow-hidden transition-colors hover:border-purple-500/50">
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
                    <ImageIcon size={48} className="mb-4 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Görsel URL (isteğe bağlı)"
                      className="w-full text-center p-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg outline-none focus:border-purple-500 text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors"
                      value={activeQuestion.image || ""}
                      onChange={(e) => updateActiveQuestion({ image: e.target.value })}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="bg-[var(--color-quiz-card)] p-4 rounded-2xl shadow-sm border border-[var(--border-color)]">
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    Süre sınırı
                  </label>
                  <select
                    value={activeQuestion.timeLimit}
                    onChange={(e) =>
                      updateActiveQuestion({ timeLimit: Number(e.target.value) })
                    }
                    className="w-full p-2 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg outline-none focus:border-purple-500 font-medium transition-colors"
                  >
                    <option value={10} className="bg-[var(--color-quiz-card)]">10 saniye</option>
                    <option value={20} className="bg-[var(--color-quiz-card)]">20 saniye</option>
                    <option value={30} className="bg-[var(--color-quiz-card)]">30 saniye</option>
                    <option value={60} className="bg-[var(--color-quiz-card)]">1 dakika</option>
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
                      className={`w-8 h-8 rounded-full border-4 cursor-pointer flex-shrink-0 flex items-center justify-center bg-black/20 ml-2 transition-colors ${activeQuestion.correctOptionIndex === index
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
          <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Soruları Kaydet</h2>
            <input
              type="text"
              placeholder="Sunucu Adı"
              value={hostNickname}
              onChange={e => setHostNickname(e.target.value)}
              className="w-full p-3 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-xl mb-4 outline-none focus:border-purple-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Yarışma Başlığı (örn. Genel Kültür)"
              value={setTitle}
              onChange={e => setSetTitle(e.target.value)}
              className="w-full p-3 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-xl mb-8 outline-none focus:border-purple-500 transition-colors"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSaveModal(false)} className="px-5 py-2.5 font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] rounded-xl transition-colors">İptal</button>
              <button onClick={handleSaveSet} className="px-5 py-2.5 font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)]">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Soruları Yükle</h2>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Sunucu Adı"
                value={hostNickname}
                onChange={e => setHostNickname(e.target.value)}
                className="flex-1 p-3 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-xl outline-none focus:border-purple-500 transition-colors"
              />
              <button onClick={handleLoadSets} className="px-5 py-2.5 font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)]">Bul</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {savedSets.map(set => (
                <div key={set.id} className="p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl flex justify-between items-center hover:bg-[var(--input-focus)] transition-colors">
                  <span className="font-bold text-[var(--text-primary)]">{set.title}</span>
                  <button onClick={() => loadSpecificSet(set.questions)} className="text-purple-600 dark:text-purple-400 font-bold hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Yükle</button>
                </div>
              ))}
              {savedSets.length === 0 && <p className="text-[var(--text-secondary)] text-center py-8 font-medium">Kayıtlı soru bulunamadı.</p>}
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border-color)]">
              <button onClick={() => setShowLoadModal(false)} className="px-5 py-2.5 font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] rounded-xl transition-colors">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
