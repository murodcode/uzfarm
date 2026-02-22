import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const MUSIC_URL = "https://cdn.pixabay.com/audio/2024/11/28/audio_3a4e2feff0.mp3";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    const tryPlay = () => {
      if (!userInteracted) {
        setUserInteracted(true);
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
    };

    // Auto-play on first user interaction
    document.addEventListener("click", tryPlay, { once: true });
    document.addEventListener("touchstart", tryPlay, { once: true });

    // Try immediate play (works in some TG WebApp contexts)
    audio.play().then(() => {
      setPlaying(true);
      setUserInteracted(true);
    }).catch(() => {});

    return () => {
      audio.pause();
      audio.src = "";
      document.removeEventListener("click", tryPlay);
      document.removeEventListener("touchstart", tryPlay);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-3 right-3 z-50 rounded-full bg-background/80 backdrop-blur-sm border border-border p-2 shadow-lg transition-transform active:scale-90"
      aria-label={playing ? "Musiqani o'chirish" : "Musiqani yoqish"}
    >
      {playing ? (
        <Volume2 className="h-4 w-4 text-primary" />
      ) : (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
