import farmBg from "@/assets/farm-bg.jpeg";

export default function FarmBackground() {
  return (
    <div className="farm-scene-bg">
      <img
        src={farmBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Slight overlay for UI readability */}
      <div className="absolute inset-0 bg-black/10" />
      <div className="farm-center-glow" />
    </div>
  );
}
