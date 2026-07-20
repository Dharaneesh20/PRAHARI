import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, File, Image as ImgIcon, Film, Table2, CheckCircle2 } from "lucide-react";

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected?: (files: File[]) => void;
}

const FILE_TYPES = [
  { label: "PDF", icon: File, color: "#D14343" },
  { label: "JPG", icon: ImgIcon, color: "#C9A227" },
  { label: "PNG", icon: ImgIcon, color: "#3F5C86" },
  { label: "MP4", icon: Film, color: "#2E9E6C" },
  { label: "CSV", icon: Table2, color: "#8B5CF6" },
];

export default function AttachmentModal({ isOpen, onClose, onFilesSelected }: AttachmentModalProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; progress: number; done: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    onFilesSelected?.(arr);

    // Simulate upload progress per file
    arr.forEach((file) => {
      const entry = { file, progress: 0, done: false };
      setUploadedFiles((prev) => [...prev, entry]);

      const interval = setInterval(() => {
        setUploadedFiles((prev) =>
          prev.map((f) => {
            if (f.file.name !== file.name) return f;
            const next = Math.min(f.progress + Math.random() * 25, 100);
            return { ...f, progress: next, done: next >= 100 };
          })
        );
      }, 200);

      setTimeout(() => clearInterval(interval), 2400);
    });
  }, [onFilesSelected]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="fixed inset-0 z-[151] flex items-center justify-center pointer-events-none p-4"
          >
            <div
              className="glass-specular pointer-events-auto w-full max-w-md rounded-3xl p-6 flex flex-col gap-5"
              style={{
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                background: "rgba(15, 20, 40, 0.90)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.1)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-base">Attach Evidence</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  aria-label="Close attachment modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drop zone */}
              <motion.div
                animate={isDraggingOver ? { scale: 1.02, borderColor: "#C9A227" } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="relative flex flex-col items-center justify-center gap-4 rounded-2xl py-10 px-6 text-center cursor-pointer"
                style={{
                  border: "2px dashed",
                  borderColor: isDraggingOver ? "#C9A227" : "rgba(255,255,255,0.18)",
                  background: isDraggingOver
                    ? "rgba(201,162,39,0.06)"
                    : "rgba(255,255,255,0.03)",
                  transition: "background 0.2s",
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.3)" }}
                >
                  <Upload className="w-6 h-6 text-[#C9A227]" />
                </motion.div>
                <div>
                  <p className="font-semibold text-white text-sm">Drag files here or click to browse</p>
                  <p className="text-white/40 text-xs mt-1">Max 50MB per file</p>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.mp4,.csv"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </motion.div>

              {/* Accepted types */}
              <div className="flex flex-wrap gap-2">
                {FILE_TYPES.map(({ label, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}35`,
                      color,
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                ))}
              </div>

              {/* Uploaded files */}
              <AnimatePresence>
                {uploadedFiles.map(({ file, progress, done }) => (
                  <motion.div
                    key={file.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {/* Progress ring */}
                    <div className="relative w-8 h-8 shrink-0">
                      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                        <circle
                          cx="16" cy="16" r="13" fill="none"
                          stroke={done ? "#2E9E6C" : "#C9A227"} strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 13}`}
                          strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
                          style={{ transition: "stroke-dashoffset 0.2s ease, stroke 0.3s" }}
                        />
                      </svg>
                      {done && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-[#2E9E6C]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {done ? "Upload complete" : `${Math.round(progress)}%`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
