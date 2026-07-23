import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTour } from "../context/TourContext";
import { useAppContext } from "../context/AppContext";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function TourOverlay() {
  const { isOpen, stepIndex, steps, nextStep, prevStep, skipTour } = useTour();
  const { language } = useAppContext();
  const location = useLocation();
  
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const currentStep = steps[stepIndex];

  // Effect to find target element and calculate its bounding client rect
  useEffect(() => {
    if (!isOpen || !currentStep || !currentStep.selector || currentStep.selector === "body") {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(currentStep.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          return true;
        }
      }
      setTargetRect(null);
      return false;
    };

    // Initial check
    const found = updatePosition();
    
    // Poll for the element as pages animate or load
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const success = updatePosition();
      if (success || attempts > 12) {
        clearInterval(interval);
      }
    }, 150);

    // Event listeners to handle resizing or scrolling
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, stepIndex, location.pathname, currentStep?.selector]);

  if (!isOpen || !currentStep) return null;

  const getCardTranslate = () => {
    if (!targetRect) {
      return { x: "-50%", y: "-50%" };
    }

    const placement = currentStep.placement || "bottom";
    const isSmallScreen = window.innerWidth < 768;

    if (isSmallScreen) {
      return { x: "-50%", y: "0%" };
    }

    switch (placement) {
      case "top":
        return { x: "-50%", y: "-100%" };
      case "bottom":
        return { x: "-50%", y: "0%" };
      case "left":
        return { x: "-100%", y: "-50%" };
      case "right":
        return { x: "0%", y: "-50%" };
      default:
        return { x: "-50%", y: "-50%" };
    }
  };

  // Determine dynamic absolute positioning styling for tooltip card
  const getCardStyle = () => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        position: "fixed" as const,
      };
    }

    const { left, top, width, height, bottom, right } = targetRect;
    const placement = currentStep.placement || "bottom";

    // Viewport safety margin check
    const margin = 20;
    const isSmallScreen = window.innerWidth < 768;

    // On mobile/small screens, place the card opposite to the target area to avoid blocking it
    if (isSmallScreen) {
      const isTargetAtBottom = top > window.innerHeight / 2;
      return {
        ...(isTargetAtBottom ? { top: `${margin + 60}px` } : { bottom: `${margin}px` }),
        left: "50%",
        position: "fixed" as const,
        width: "calc(100% - 40px)",
        maxWidth: "420px",
      };
    }

    switch (placement) {
      case "top":
        return {
          top: `${Math.max(margin, top - 32)}px`,
          left: `${left + width / 2}px`,
          position: "fixed" as const,
        };
      case "bottom":
        return {
          top: `${Math.min(window.innerHeight - margin - 200, bottom + 32)}px`,
          left: `${left + width / 2}px`,
          position: "fixed" as const,
        };
      case "left":
        return {
          top: `${top + height / 2}px`,
          left: `${Math.max(margin, left - 32)}px`,
          position: "fixed" as const,
        };
      case "right":
        return {
          top: `${top + height / 2}px`,
          left: `${Math.min(window.innerWidth - margin - 350, right + 32)}px`,
          position: "fixed" as const,
        };
      default:
        return {
          top: "50%",
          left: "50%",
          position: "fixed" as const,
        };
    }
  };

  const title = language === "kn" ? currentStep.titleKn : currentStep.titleEn;
  const description = language === "kn" ? currentStep.textKn : currentStep.textEn;
  const catalystText = language === "kn" ? currentStep.catalystKn : currentStep.catalystEn;
  
  const progressPercent = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none">
      
      {/* ── Dark Overlay with SVG cutout mask ──────────────────── */}
      <svg className="fixed inset-0 w-full h-full pointer-events-auto z-10">
        <defs>
          <mask id="tour-cutout-mask">
            {/* White fills the viewport (dark backdrop covers this) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out a hole (keeping target element illuminated) */}
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(8, 12, 28, 0.72)"
          mask="url(#tour-cutout-mask)"
        />
      </svg>

      {/* ── Glowing outline border around target element ────────── */}
      <AnimatePresence>
        {targetRect && (
          <motion.div
            key={`highlight-${stepIndex}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed border-2 rounded-xl z-20"
            style={{
              borderColor: "#C9A227",
              boxShadow: "0 0 0 4px rgba(201, 162, 39, 0.15), 0 0 16px rgba(201, 162, 39, 0.6)",
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          >
            {/* Inner subtle breathing glow animation */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-[10px]"
              style={{
                boxShadow: "inset 0 0 12px rgba(201, 162, 39, 0.4)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Interactive Floating Tooltip Card ──────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-30">
        <motion.div
          key={`card-${stepIndex}`}
          initial={{ opacity: 0, scale: 0.92, x: getCardTranslate().x, y: getCardTranslate().y }}
          animate={{ opacity: 1, scale: 1, x: getCardTranslate().x, y: getCardTranslate().y }}
          exit={{ opacity: 0, scale: 0.95, x: getCardTranslate().x, y: getCardTranslate().y }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          style={{
            ...getCardStyle(),
            x: getCardTranslate().x,
            y: getCardTranslate().y,
          }}
          className="pointer-events-auto w-[340px] max-w-[95vw] rounded-3xl p-6 glass-specular select-text shadow-2xl flex flex-col gap-4 font-['Inter','Ubuntu',sans-serif] border text-white"
          layout
        >
          <style>{`
            .glass-specular {
              backdrop-filter: blur(28px) saturate(180%);
              WebkitBackdrop-filter: blur(28px) saturate(180%);
              background: rgba(11, 19, 43, 0.92);
              border: 1px solid rgba(255, 255, 255, 0.12);
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.08);
            }
          `}</style>

          {/* Header row */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#C9A227]/10 border border-[#C9A227]/30">
                <HelpCircle className="w-4 h-4 text-[#C9A227]" />
              </span>
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#C9A227]">
                {language === "kn" ? "ಅಪ್ಲಿಕೇಶನ್ ಪ್ರವಾಸ" : "System Tour"}
              </h4>
            </div>
            <button
              onClick={skipTour}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title={language === "kn" ? "ಪ್ರವಾಸ ಮುಚ್ಚಿ" : "Skip Tour"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-base font-bold text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {description}
            </p>
          </div>

          {/* Catalyst integration highlight box */}
          {catalystText && (
            <div
              className="rounded-2xl p-3 border flex flex-col gap-1 bg-amber-500/5 border-amber-500/20"
              style={{
                boxShadow: "inset 0 1px 2px rgba(201, 162, 39, 0.05)",
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">
                <img src="/catalyst.svg" alt="Catalyst" className="w-3.5 h-3.5" />
                <span>{currentStep.serviceName || "Zoho Catalyst Engine"}</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-normal font-semibold">
                {catalystText}
              </p>
            </div>
          )}

          {/* Navigation controls footer */}
          <div className="flex items-center justify-between gap-4 mt-1 pt-3 border-t border-white/10">
            {/* Step indicators */}
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[10px] font-mono text-white/40 uppercase font-bold tracking-wider">
                {language === "kn" ? `ಹಂತ ${stepIndex + 1} / ${steps.length}` : `Step ${stepIndex + 1} of ${steps.length}`}
              </span>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#C9A227] h-full"
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {stepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-black font-extrabold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(90deg, #C9A227, #e0c159)",
                  boxShadow: "0 4px 12px rgba(201, 162, 39, 0.3)",
                }}
              >
                <span>
                  {stepIndex === steps.length - 1
                    ? (language === "kn" ? "ಮುಗಿಸಿ" : "Finish")
                    : (language === "kn" ? "ಮುಂದೆ" : "Next")}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
