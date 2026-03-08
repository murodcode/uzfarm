import { useEffect, useState } from "react";
import farmBg from "@/assets/farm-bg.jpeg";
import farmBgNight from "@/assets/farm-bg-night.png";

export default function FarmBackground() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="farm-scene-bg">
      <img
        src={isDark ? farmBgNight : farmBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/10" />
      <div className="farm-center-glow" />
    </div>
  );
}
