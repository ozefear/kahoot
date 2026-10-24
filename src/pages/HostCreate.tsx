import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Plus, Trash2, Image as ImageIcon, Save, Menu, X, FolderOpen, Play, Sparkles, Download, Upload, GripVertical, BarChart2, Crown, Tv, Clapperboard, Palette, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import { SHAPES } from "../components/Shapes";
import { THEMES, THEME_LIST, applyTheme, getTheme } from "../themes";

type Question = {
  id: string;
  title: string;
  image?: string;
  options: string[];
  correctOptionIndex: number;
  timeLimit: number;
};

const SITCOM_DEFAULT_QUESTIONS: Question[] = [
  {
    id: uuidv4(),
    title: "Friends dizisinde Ross Geller'ın meşhur evcil maymununun adı nedir?",
    options: ["Marcel", "Joey", "Gunther", "Paolo"],
    correctOptionIndex: 0,
    timeLimit: 20,
  },
  {
    id: uuidv4(),
    title: "The Office dizisinde Dwight Schrute'un çiftliğinde (Schrute Farms) en çok yetiştirdiği ürün hangisidir?",
    options: ["Patates", "Pancar (Beets)", "Mısır", "Havuç"],
    correctOptionIndex: 1,
    timeLimit: 20,
  },
  {
    id: uuidv4(),
    title: "Brooklyn Nine-Nine'da Dedektif Jake Peralta'nın favori filmi ve hayat felsefesi hangisidir?",
    options: ["Zor Ölüm (Die Hard)", "Görevimiz Tehlike", "Cehennem Silahı", "Hızlı ve Öfkeli"],
    correctOptionIndex: 0,
    timeLimit: 20,
  },
  {
    id: uuidv4(),
    title: "How I Met Your Mother'da Barney Stinson'ın kadınları tavlamak için yazdığı efsanevi kitabın adı nedir?",
    options: ["The Bro Code", "Suit Up Guide", "The Playbook", "Legendary Rules"],
    correctOptionIndex: 2,
    timeLimit: 20,
  },
  {
    id: uuidv4(),
    title: "Seinfeld dizisinde George Costanza'nın uydurduğu sahte hayır kurumunun adı nedir?",
    options: ["Vandelay Industries", "Kramerica", "The Human Fund", "Festivus Foundation"],
    correctOptionIndex: 2,
    timeLimit: 20,
  },
];

export default function HostCreate() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(SITCOM_DEFAULT_QUESTIONS);
  const [activeQuestionId, setActiveQuestionId] = useState(SITCOM_DEFAULT_QUESTIONS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [hostNickname, setHostNickname] = useState(sessionStorage.getItem("hostNickname") || "");
  const [selectedTheme, setSelectedTheme] = useState(() => sessionStorage.getItem("selectedTheme") || "sitcom");
  const [setTitle, setSetTitle] = useState(() => {
    const stored = sessionStorage.getItem("setTitle");
    if (!stored || stored === "ACM Kahoot" || stored.includes("Sitcom Gecesi")) return "Hacettepe Kahoot";
    return stored;
  });
  const [savedSets, setSavedSets] = useState<any[]>([]);

  useEffect(() => {
    applyTheme(selectedTheme);
  }, [selectedTheme]);

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

  const handleLoadSitcomTemplate = () => {
    const freshQuestions: Question[] = [
      {
        id: uuidv4(),
        title: "Friends dizisinde Ross Geller'ın meşhur evcil maymununun adı nedir?",
        options: ["Marcel", "Joey", "Gunther", "Paolo"],
        correctOptionIndex: 0,
        timeLimit: 20,
      },
      {
        id: uuidv4(),
        title: "The Office dizisinde Dwight Schrute'un çiftliğinde (Schrute Farms) en çok yetiştirdiği ürün hangisidir?",
        options: ["Patates", "Pancar (Beets)", "Mısır", "Havuç"],
        correctOptionIndex: 1,
        timeLimit: 20,
      },
      {
        id: uuidv4(),
        title: "Brooklyn Nine-Nine'da Dedektif Jake Peralta'nın favori filmi ve hayat felsefesi hangisidir?",
        options: ["Zor Ölüm (Die Hard)", "Görevimiz Tehlike", "Cehennem Silahı", "Hızlı ve Öfkeli"],
        correctOptionIndex: 0,
        timeLimit: 20,
      },
      {
        id: uuidv4(),
        title: "How I Met Your Mother'da Barney Stinson'ın kadınları tavlamak için yazdığı efsanevi kitabın adı nedir?",
        options: ["The Bro Code", "Suit Up Guide", "The Playbook", "Legendary Rules"],
        correctOptionIndex: 2,
        timeLimit: 20,
      },
      {
        id: uuidv4(),
        title: "Seinfeld dizisinde George Costanza'nın uydurduğu sahte hayır kurumunun adı nedir?",
        options: ["Vandelay Industries", "Kramerica", "The Human Fund", "Festivus Foundation"],
        correctOptionIndex: 2,
        timeLimit: 20,
      },
    ];
    setQuestions(freshQuestions);
    setActiveQuestionId(freshQuestions[0].id);
    setSetTitle("Hacettepe Kahoot - Sitcom Gecesi");
  };

  const handleCreateLobby = () => {
    // Validate questions
    const isValid = questions.every(
      (q) => q.title.trim() && q.options.every((opt) => opt.trim())
    );
    if (!isValid) {
      alert("Lütfen tüm soru başlıklarını ve seçenekleri doldurun.");
      return;
    }

    if (!hostNickname.trim()) {
      setShowCreateModal(true);
      return;
    }

    const effectiveAdmin = hostNickname.trim();
    const effectiveTitle = setTitle.trim() || "Hacettepe Kahoot";
    sessionStorage.setItem("hostNickname", effectiveAdmin);
    sessionStorage.setItem("setTitle", effectiveTitle);
    sessionStorage.setItem("selectedTheme", selectedTheme);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "host_create_game",
      { questions, hostNickname: effectiveAdmin, title: effectiveTitle, theme: selectedTheme },
      (response: any) => {
        if (response && response.pin) {
          navigate(`/host/lobby/${response.pin}`);
        }
      }
    );
  };

  const confirmCreateLobbyWithAdmin = (adminName: string, title: string) => {
    const finalAdmin = adminName.trim() || "Admin";
    const finalTitle = title.trim() || "Hacettepe Kahoot";
    setHostNickname(finalAdmin);
    setSetTitle(finalTitle);
    sessionStorage.setItem("hostNickname", finalAdmin);
    sessionStorage.setItem("setTitle", finalTitle);
    sessionStorage.setItem("selectedTheme", selectedTheme);
    setShowCreateModal(false);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "host_create_game",
      { questions, hostNickname: finalAdmin, title: finalTitle, theme: selectedTheme },
      (response: any) => {
        if (response && response.pin) {
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
    <div className="h-screen w-screen overflow-hidden bg-[var(--color-quiz-bg)] bg-dot-pattern flex flex-col font-sans text-[var(--text-primary)] selection:bg-purple-500/30">
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-[var(--border-color)] bg-[var(--color-quiz-bg)]/80 backdrop-blur-md z-20 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30 hidden sm:flex">
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Hacettepe Kahoot</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          {/* Room Name Input - Admin can type and edit freely */}
          <div className="flex items-center gap-1.5 bg-[var(--input-bg)] border border-purple-500/40 px-3 py-1.5 rounded-lg text-sm shadow-sm" title="Oda / Yarışma İsmi (İstediğinizi yazabilirsiniz)">
            <Tv size={16} className="text-purple-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Oda İsmi"
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              className="bg-transparent font-bold outline-none w-28 sm:w-44 text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-xs sm:text-sm"
              maxLength={35}
            />
          </div>

          {/* Theme Selector Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-purple-500/40 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold hover:bg-[var(--input-focus)] transition-all shadow-sm"
            title="Renk Temasını Seçin"
          >
            <Palette size={16} className="text-purple-500 flex-shrink-0" />
            <span className="hidden sm:inline">Tema:</span>
            <span className="flex items-center gap-1">
              <span>{getTheme(selectedTheme).badge}</span>
              <span className="hidden md:inline font-bold">{getTheme(selectedTheme).name}</span>
            </span>
          </button>

          {/* Admin Name Input */}
          <div className="flex items-center gap-1.5 bg-[var(--input-bg)] border border-yellow-500/40 px-3 py-1.5 rounded-lg text-sm shadow-sm" title="Oda Yöneticisi (Admin) Adınız">
            <Crown size={16} className="text-yellow-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Admin Adınız"
              value={hostNickname}
              onChange={(e) => setHostNickname(e.target.value)}
              className="bg-transparent font-bold outline-none w-20 sm:w-28 text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-xs sm:text-sm"
              maxLength={15}
            />
          </div>

          {/* Sitcom Template Button */}
          <button
            onClick={handleLoadSitcomTemplate}
            className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 px-3 py-2 rounded-lg font-bold hover:bg-yellow-500/20 flex items-center gap-1.5 text-xs sm:text-sm transition-colors shadow-sm"
            title="Sitcom Sorularını Yeniden Yükle"
          >
            <Clapperboard size={15} />
            <span className="hidden sm:inline">Sitcom Soruları</span>
          </button>

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

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className={`
          absolute md:relative z-10 w-72 md:w-80 h-full bg-[var(--color-quiz-card)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0
          transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {/* Sidebar Top: Soru Başlığı & Sayaç */}
          <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0 bg-[var(--color-quiz-card)]">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-slate-300">Sorular</span>
              <span className="bg-purple-600/30 text-purple-200 border border-purple-400/30 text-xs font-black px-2.5 py-0.5 rounded-full">
                {questions.length}
              </span>
            </div>
            <button
              onClick={handleAddQuestion}
              className="text-xs font-black text-purple-300 hover:text-white bg-purple-600/30 hover:bg-purple-600 border border-purple-400/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus size={14} /> Soru Ekle
            </button>
          </div>

          {/* Soru Listesi - Kendi İçinde Kaydırılabilir Alan */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {questions.map((q, index) => (
                      <Draggable draggableId={q.id} index={index} key={q.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={() => {
                              setActiveQuestionId(q.id);
                              setSidebarOpen(false);
                            }}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer relative group transition-all select-none ${
                              activeQuestionId === q.id
                                ? "border-purple-400 bg-purple-600/20 shadow-md ring-2 ring-purple-500/20"
                                : "border-white/10 hover:border-purple-400/50 bg-[var(--input-bg)] hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="text-slate-400 hover:text-white cursor-grab active:cursor-grabbing p-0.5"
                                  title="Sürükle & Sırala"
                                >
                                  <GripVertical size={16} />
                                </div>
                                <span className="font-extrabold text-xs uppercase tracking-wider text-purple-300">
                                  {index + 1}. Soru
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-slate-300 bg-black/30 border border-white/10 px-2 py-0.5 rounded">
                                {q.timeLimit}s
                              </span>
                            </div>
                            <div className="text-sm font-bold text-white pl-6 line-clamp-2 leading-snug break-words">
                              {q.title || "Boş soru..."}
                            </div>
                            {questions.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuestion(q.id);
                                }}
                                className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-500/30 rounded-md border border-white/10"
                                title="Soruyu Sil"
                              >
                                <Trash2 size={14} />
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
          </div>

          {/* Alt Sabit Buton */}
          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--color-quiz-card)]/90 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={handleAddQuestion}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-purple-400/40 text-purple-200 font-extrabold hover:border-purple-400 hover:bg-purple-600/20 hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer text-sm"
            >
              <Plus size={18} /> Yeni Soru Ekle
            </button>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-0 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Editor */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 custom-scrollbar">
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
                    <option value={45} className="bg-[var(--color-quiz-card)]">45 saniye</option>
                    <option value={60} className="bg-[var(--color-quiz-card)]">1 dakika</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeQuestion.options.map((opt, index) => {
                const themeOpt = getTheme(selectedTheme).options[index] || getTheme(selectedTheme).options[0];
                const Shape = SHAPES[index];
                return (
                  <div
                    key={index}
                    style={{ backgroundColor: themeOpt.hex }}
                    className="relative p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-3 md:gap-4 transition-all border-2 border-white/20"
                  >
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-black/25 flex-shrink-0 text-white flex items-center justify-center border border-white/20">
                      <Shape className="w-5 h-5 md:w-6 md:h-6 drop-shadow-md" />
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
                      className="w-full bg-transparent text-white placeholder-white/70 text-lg md:text-xl font-black outline-none drop-shadow-sm"
                    />
                    <div
                      onClick={() =>
                        updateActiveQuestion({ correctOptionIndex: index })
                      }
                      className={`w-9 h-9 rounded-full border-4 cursor-pointer flex-shrink-0 flex items-center justify-center bg-black/30 ml-2 transition-all ${activeQuestion.correctOptionIndex === index
                          ? "border-white bg-white/30 scale-105"
                          : "border-white/40 hover:border-white/70"
                        }`}
                    >
                      {activeQuestion.correctOptionIndex === index && (
                        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-md" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

      {/* Theme Picker Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Palette className="w-6 h-6 text-purple-500" />
                <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">Renk Teması Seçimi</h2>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 font-medium">
              Seçtiğiniz renk teması odadaki tüm oyuncuların ekranına eşzamanlı olarak yansıtılacaktır.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {THEME_LIST.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedTheme(theme.id);
                      sessionStorage.setItem("selectedTheme", theme.id);
                      applyTheme(theme.id);
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 cursor-pointer ${isSelected
                        ? "border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/20"
                        : "border-[var(--border-color)] bg-[var(--input-bg)] hover:bg-[var(--input-focus)]"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>{theme.badge}</span>
                        <span>{theme.name}</span>
                      </span>
                      {isSelected && <Check size={16} className="text-purple-500 flex-shrink-0" />}
                    </div>
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {theme.previewColors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-5 h-5 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowThemeModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md"
              >
                Temayı Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Name & Lobby Setup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-quiz-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4 text-yellow-500">
              <Crown size={32} />
            </div>
            <h2 className="text-2xl font-black text-center mb-1 text-[var(--text-primary)]">Oda Yöneticisi (Admin)</h2>
            <p className="text-sm text-center text-[var(--text-secondary)] mb-6">Lobiyi oluşturan kişi olarak yönetici adınızı, oda başlığını ve temanızı belirleyin.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Admin / Yönetici Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet"
                  value={hostNickname}
                  onChange={(e) => setHostNickname(e.target.value)}
                  className="w-full p-3.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-primary)] focus:border-yellow-500 focus:outline-none"
                  autoFocus
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Oda / Yarışma Başlığı</label>
                <input
                  type="text"
                  placeholder="Örn: Hacettepe Sitcom Gecesi"
                  value={setTitle}
                  onChange={(e) => setSetTitle(e.target.value)}
                  className="w-full p-3.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-primary)] focus:border-purple-500 focus:outline-none"
                  maxLength={35}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Renk Teması</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {THEME_LIST.map((theme) => (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => {
                        setSelectedTheme(theme.id);
                        applyTheme(theme.id);
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs font-bold ${selectedTheme === theme.id
                          ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                          : "border-[var(--border-color)] bg-[var(--input-bg)]"
                        }`}
                    >
                      <span className="truncate">{theme.badge} {theme.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {theme.previewColors.slice(0, 2).map((c, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 font-bold rounded-xl bg-[var(--input-bg)] hover:bg-[var(--input-focus)] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => confirmCreateLobbyWithAdmin(hostNickname || "Admin", setTitle || "Hacettepe Kahoot")}
                className="flex-1 py-3 font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Odayı Başlat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
