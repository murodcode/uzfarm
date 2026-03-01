import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme on load
const savedTheme = localStorage.getItem("farm-theme") || "auto";
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (savedTheme === "auto") {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
