export type ThemeOption = {
  bg: string;
  hover: string;
  shadow: string;
  hex: string;
};

export type ThemeConfig = {
  id: string;
  name: string;
  badge: string;
  previewColors: string[];
  bgColor: string;
  cardColor: string;
  borderColor: string;
  primaryHex: string;
  accentHex: string;
  primaryClass: string;
  options: ThemeOption[];
};

export const THEMES: Record<string, ThemeConfig> = {
  sitcom: {
    id: "sitcom",
    name: "Sitcom Moru (90'lar)",
    badge: "📺",
    previewColors: ["#8b5cf6", "#ef4444", "#3b82f6", "#f59e0b"],
    bgColor: "#130f26",
    cardColor: "#1e1b38",
    borderColor: "rgba(139, 92, 246, 0.25)",
    primaryHex: "#8b5cf6",
    accentHex: "#f59e0b",
    primaryClass: "bg-purple-600 hover:bg-purple-700",
    options: [
      { bg: "bg-red-500 hover:bg-red-600 active:bg-red-700", hover: "hover:bg-red-600", shadow: "shadow-red-500/40", hex: "#ef4444" },
      { bg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800", hover: "hover:bg-blue-700", shadow: "shadow-blue-500/40", hex: "#2563eb" },
      { bg: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700", hover: "hover:bg-amber-600", shadow: "shadow-amber-500/40", hex: "#f59e0b" },
      { bg: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800", hover: "hover:bg-emerald-700", shadow: "shadow-emerald-500/40", hex: "#059669" },
    ],
  },
  centralperk: {
    id: "centralperk",
    name: "Central Perk (Sıcak Kahve)",
    badge: "☕",
    previewColors: ["#d97706", "#dc2626", "#4f46e5", "#15803d"],
    bgColor: "#18110b",
    cardColor: "#271c13",
    borderColor: "rgba(217, 119, 6, 0.3)",
    primaryHex: "#d97706",
    accentHex: "#fbbf24",
    primaryClass: "bg-amber-600 hover:bg-amber-700",
    options: [
      { bg: "bg-red-600 hover:bg-red-700 active:bg-red-800", hover: "hover:bg-red-700", shadow: "shadow-red-600/40", hex: "#dc2626" },
      { bg: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800", hover: "hover:bg-indigo-700", shadow: "shadow-indigo-600/40", hex: "#4f46e5" },
      { bg: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800", hover: "hover:bg-amber-700", shadow: "shadow-amber-600/40", hex: "#d97706" },
      { bg: "bg-green-700 hover:bg-green-800 active:bg-green-900", hover: "hover:bg-green-800", shadow: "shadow-green-700/40", hex: "#15803d" },
    ],
  },
  classic: {
    id: "classic",
    name: "Klasik Kahoot",
    badge: "🎉",
    previewColors: ["#46178f", "#e21b3c", "#1368ce", "#26890c"],
    bgColor: "#1e0847",
    cardColor: "#2d126b",
    borderColor: "rgba(168, 85, 247, 0.3)",
    primaryHex: "#7c3aed",
    accentHex: "#1368ce",
    primaryClass: "bg-purple-700 hover:bg-purple-800",
    options: [
      { bg: "bg-red-500 hover:bg-red-600 active:bg-red-700", hover: "hover:bg-red-600", shadow: "shadow-red-500/40", hex: "#e21b3c" },
      { bg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800", hover: "hover:bg-blue-700", shadow: "shadow-blue-500/40", hex: "#1368ce" },
      { bg: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700", hover: "hover:bg-amber-600", shadow: "shadow-amber-500/40", hex: "#d89e00" },
      { bg: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800", hover: "hover:bg-emerald-700", shadow: "shadow-emerald-500/40", hex: "#26890c" },
    ],
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyber Neon",
    badge: "⚡",
    previewColors: ["#06b6d4", "#f43f5e", "#eab308", "#10b981"],
    bgColor: "#070b14",
    cardColor: "#0f172a",
    borderColor: "rgba(6, 182, 212, 0.35)",
    primaryHex: "#06b6d4",
    accentHex: "#ec4899",
    primaryClass: "bg-cyan-600 hover:bg-cyan-700",
    options: [
      { bg: "bg-rose-500 hover:bg-rose-600 active:bg-rose-700", hover: "hover:bg-rose-600", shadow: "shadow-rose-500/40", hex: "#f43f5e" },
      { bg: "bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700", hover: "hover:bg-cyan-600", shadow: "shadow-cyan-500/40", hex: "#06b6d4" },
      { bg: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-gray-950", hover: "hover:bg-yellow-600", shadow: "shadow-yellow-500/40", hex: "#eab308" },
      { bg: "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700", hover: "hover:bg-emerald-600", shadow: "shadow-emerald-500/40", hex: "#10b981" },
    ],
  },
  sunset: {
    id: "sunset",
    name: "Günbatımı (Mercan)",
    badge: "🌅",
    previewColors: ["#f43f5e", "#ea580c", "#6366f1", "#0d9488"],
    bgColor: "#1a0f1e",
    cardColor: "#29162e",
    borderColor: "rgba(244, 63, 94, 0.3)",
    primaryHex: "#f43f5e",
    accentHex: "#f97316",
    primaryClass: "bg-rose-600 hover:bg-rose-700",
    options: [
      { bg: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800", hover: "hover:bg-rose-700", shadow: "shadow-rose-600/40", hex: "#f43f5e" },
      { bg: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800", hover: "hover:bg-indigo-700", shadow: "shadow-indigo-600/40", hex: "#6366f1" },
      { bg: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700", hover: "hover:bg-orange-600", shadow: "shadow-orange-500/40", hex: "#f97316" },
      { bg: "bg-teal-600 hover:bg-teal-700 active:bg-teal-800", hover: "hover:bg-teal-700", shadow: "shadow-teal-600/40", hex: "#0d9488" },
    ],
  },
  emerald: {
    id: "emerald",
    name: "Zümrüt Yeşil",
    badge: "🌿",
    previewColors: ["#059669", "#dc2626", "#2563eb", "#d97706"],
    bgColor: "#071712",
    cardColor: "#0d2b20",
    borderColor: "rgba(16, 185, 129, 0.3)",
    primaryHex: "#10b981",
    accentHex: "#34d399",
    primaryClass: "bg-emerald-600 hover:bg-emerald-700",
    options: [
      { bg: "bg-red-500 hover:bg-red-600 active:bg-red-700", hover: "hover:bg-red-600", shadow: "shadow-red-500/40", hex: "#dc2626" },
      { bg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800", hover: "hover:bg-blue-700", shadow: "shadow-blue-500/40", hex: "#2563eb" },
      { bg: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700", hover: "hover:bg-amber-600", shadow: "shadow-amber-500/40", hex: "#d97706" },
      { bg: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800", hover: "hover:bg-emerald-700", shadow: "shadow-emerald-500/40", hex: "#059669" },
    ],
  },
  midnight: {
    id: "midnight",
    name: "Gece Yarısı (Minimal Koyu)",
    badge: "🌙",
    previewColors: ["#6366f1", "#ef4444", "#3b82f6", "#10b981"],
    bgColor: "#090a0f",
    cardColor: "#131622",
    borderColor: "rgba(255, 255, 255, 0.15)",
    primaryHex: "#6366f1",
    accentHex: "#818cf8",
    primaryClass: "bg-indigo-600 hover:bg-indigo-700",
    options: [
      { bg: "bg-red-600 hover:bg-red-700 active:bg-red-800", hover: "hover:bg-red-700", shadow: "shadow-red-600/40", hex: "#ef4444" },
      { bg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800", hover: "hover:bg-blue-700", shadow: "shadow-blue-600/40", hex: "#3b82f6" },
      { bg: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800", hover: "hover:bg-amber-700", shadow: "shadow-amber-600/40", hex: "#f59e0b" },
      { bg: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800", hover: "hover:bg-emerald-700", shadow: "shadow-emerald-600/40", hex: "#10b981" },
    ],
  },
};

export const THEME_LIST = Object.values(THEMES);

export function applyTheme(themeId: string = "sitcom") {
  const theme = THEMES[themeId] || THEMES.sitcom;
  const root = document.documentElement;

  root.style.setProperty("--bg-color", theme.bgColor);
  root.style.setProperty("--card-color", theme.cardColor);
  root.style.setProperty("--border-color", theme.borderColor);
  root.style.setProperty("--primary-theme", theme.primaryHex);
  root.style.setProperty("--accent-theme", theme.accentHex);
  root.style.setProperty("--text-primary", "#ffffff");
  root.style.setProperty("--text-secondary", "#cbd5e1");
  root.style.setProperty("--text-muted", "#94a3b8");
  root.style.setProperty("--input-bg", "rgba(255, 255, 255, 0.08)");
  root.style.setProperty("--input-focus", "rgba(255, 255, 255, 0.16)");
  root.classList.add("dark");
  root.style.colorScheme = "dark";
}

export function getTheme(themeId: string = "sitcom"): ThemeConfig {
  return THEMES[themeId] || THEMES.sitcom;
}
