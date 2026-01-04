import { Play, Pause } from "lucide-react";
import { useState, useRef } from "react";

const AudioMessage = ({ src, isMyMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const waveHeights = [20, 40, 70, 30, 60, 35, 80, 40, 60, 25, 45, 20];
  const durations = [
    0.7, 0.6, 0.35, 0.5, 0.7, 0.45, 0.65, 0.3, 0.55, 0.4, 0.6, 0.35,
  ];

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl min-w-[200px] ${
        isMyMessage ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"
      }`}
    >
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={`flex items-center justify-center size-10 rounded-full transition-colors shrink-0 ${
          isMyMessage
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-slate-700 hover:bg-slate-600 text-cyan-500"
        }`}
      >
        {isPlaying ? (
          <Pause size={20} fill="currentColor" />
        ) : (
          <Play size={20} fill="currentColor" className="ml-1" />
        )}
      </button>

      {/* Waveform (Animation) */}
      <div className="w-full flex items-center gap-[3px] h-8 items-end">
        {waveHeights.map((height, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              isMyMessage ? "bg-white/80" : "bg-cyan-500"
            }`}
            style={{
              height: isPlaying ? "50%" : `${height}%`,
              animationName: isPlaying ? "wave" : "none",
              animationDuration: `${durations[i]}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <div className={`text-xs font-medium opacity-80 text-right pr-1`}>
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
    </div>
  );
};

export default AudioMessage;
