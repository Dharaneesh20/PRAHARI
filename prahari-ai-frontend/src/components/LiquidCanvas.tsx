import { useTheme } from "./theme-provider";

/**
 * LiquidCanvas — full-bleed animated gradient-blob background.
 * Three blobs float independently using CSS keyframe animations.
 * Dark mode: navy/steel/gold on near-black canvas.
 * Light mode: ice-blue/soft-gold on near-white canvas.
 * Placed once in DashboardLayout and Login — stays behind everything.
 */
export default function LiquidCanvas() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Canvas base colour */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: isDark ? "#05070D" : "#F4F6FA" }}
      />

      {/* Blob 1 — Navy / Ice Blue */}
      <div
        className="absolute rounded-full"
        style={{
          width: "55vw",
          height: "55vw",
          top: "-15vw",
          left: "-10vw",
          background: isDark
            ? "radial-gradient(circle, rgba(27,42,74,0.75) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: "blobFloat1 22s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Blob 2 — Steel Blue / Pale Indigo */}
      <div
        className="absolute rounded-full"
        style={{
          width: "50vw",
          height: "50vw",
          bottom: "-10vw",
          right: "-8vw",
          background: isDark
            ? "radial-gradient(circle, rgba(63,92,134,0.55) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(165,180,252,0.30) 0%, transparent 70%)",
          filter: "blur(56px)",
          animation: "blobFloat2 28s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Blob 3 — Gold accent */}
      <div
        className="absolute rounded-full"
        style={{
          width: "35vw",
          height: "35vw",
          top: "40%",
          left: "55%",
          background: isDark
            ? "radial-gradient(circle, rgba(201,162,39,0.14) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(201,162,39,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "blobFloat3 18s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Very subtle noise vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 50%, rgba(5,7,13,0.55) 100%)"
            : "radial-gradient(ellipse at center, transparent 50%, rgba(244,246,250,0.45) 100%)",
        }}
      />
    </div>
  );
}
