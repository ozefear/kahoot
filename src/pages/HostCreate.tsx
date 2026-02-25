import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { Plus, Trash2, Image as ImageIcon, Save } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

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
      alert("Please fill in all question titles and options.");
      return;
    }

    socket.emit("host_create_game", { questions }, (response: any) => {
      if (response.pin) {
        navigate(`/host/lobby/${response.pin}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-black text-indigo-600">Create Game</h1>
        <button
          onClick={handleCreateLobby}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
        >
          <Save size={20} />
          Create Lobby
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-4">
          {questions.map((q, index) => (
            <div
              key={q.id}
              onClick={() => setActiveQuestionId(q.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer relative group ${
                activeQuestionId === q.id
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-gray-500 mb-2">Question {index + 1}</div>
              <div className="text-sm truncate text-gray-700">
                {q.title || "Empty question"}
              </div>
              {questions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuestion(q.id);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddQuestion}
            className="p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Add Question
          </button>
        </div>

        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <input
              type="text"
              placeholder="Start typing your question"
              value={activeQuestion.title}
              onChange={(e) => updateActiveQuestion({ title: e.target.value })}
              className="w-full text-center text-4xl font-bold p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent focus:border-indigo-500 outline-none"
            />

            <div className="flex justify-center gap-4">
              <div className="w-96 h-64 bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-4 relative overflow-hidden">
                {activeQuestion.image ? (
                  <>
                    <img
                      src={activeQuestion.image}
                      alt="Question"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      onClick={() => updateActiveQuestion({ image: undefined })}
                      className="absolute top-2 right-2 bg-white/80 p-2 rounded-full text-red-500 hover:bg-white"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon size={48} className="mb-4" />
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      className="w-full text-center p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                      value={activeQuestion.image || ""}
                      onChange={(e) => updateActiveQuestion({ image: e.target.value })}
                    />
                  </>
                )}
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Time limit
                  </label>
                  <select
                    value={activeQuestion.timeLimit}
                    onChange={(e) =>
                      updateActiveQuestion({ timeLimit: Number(e.target.value) })
                    }
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {activeQuestion.options.map((opt, index) => {
                const colors = [
                  "bg-red-500",
                  "bg-blue-500",
                  "bg-yellow-500",
                  "bg-green-500",
                ];
                const hoverColors = [
                  "hover:bg-red-600",
                  "hover:bg-blue-600",
                  "hover:bg-yellow-600",
                  "hover:bg-green-600",
                ];
                return (
                  <div
                    key={index}
                    className={`relative p-6 rounded-2xl shadow-sm flex items-center gap-4 transition-colors ${colors[index]}`}
                  >
                    <div
                      onClick={() =>
                        updateActiveQuestion({ correctOptionIndex: index })
                      }
                      className={`w-8 h-8 rounded-full border-4 cursor-pointer flex-shrink-0 flex items-center justify-center bg-white/20 ${
                        activeQuestion.correctOptionIndex === index
                          ? "border-white"
                          : "border-white/50 hover:border-white"
                      }`}
                    >
                      {activeQuestion.correctOptionIndex === index && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={`Add answer ${index + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...activeQuestion.options];
                        newOptions[index] = e.target.value;
                        updateActiveQuestion({ options: newOptions });
                      }}
                      className="w-full bg-transparent text-white placeholder-white/70 text-xl font-bold outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
