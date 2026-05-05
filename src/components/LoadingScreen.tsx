import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Bike } from 'lucide-react';

export default function LoadingScreen({ onFinished }: { onFinished: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onFinished, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onFinished]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -1000 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[10000] bg-surface flex flex-col items-center justify-center transition-colors duration-500"
    >
      <div className="relative w-72 mb-12">
        {/* Moving Icon */}
        <motion.div 
          className="absolute -top-10 left-0 text-primary flex flex-col items-center"
          animate={{ left: `${progress}%` }}
          style={{ translateX: '-50%' }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
        >
          <motion.div
            animate={{ 
              y: [0, -4, 0],
              rotate: progress === 100 ? 0 : [0, 8, -4, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              y: { repeat: Infinity, duration: 0.15, ease: "easeInOut" },
              rotate: { repeat: Infinity, duration: 0.3, ease: "linear" },
              scale: { repeat: Infinity, duration: 0.4 }
            }}
          >
            <Bike size={32} strokeWidth={2.5} className="drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
          </motion.div>
          {/* Speed particles */}
          {progress < 100 && (
            <div className="absolute top-8 -left-4 flex gap-1">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.8, x: 0, scale: 1 }}
                  animate={{ opacity: 0, x: -30, scale: 0.5 }}
                  transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.1 }}
                  className="w-1 h-1 bg-primary/40 rounded-full"
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Progress Bar Container */}
        <div className="h-2 bg-base-content/5 rounded-full overflow-hidden w-full backdrop-blur-sm border border-white/5">
          <motion.div
            className="h-full bg-primary relative"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", damping: 30, stiffness: 100 }}
          >
            <motion.div 
              className="absolute top-0 right-0 h-full w-12 bg-white/30 blur-md"
              animate={{ x: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-6 space-y-2"
      >
        <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-white leading-tight">
          Sedang menuju ke
        </h2>
        <h2 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-primary italic leading-tight">
          Desainer Sragen.
        </h2>
        <div className="mt-6 text-base-content/30 text-xs font-mono font-bold tracking-[0.3em] uppercase">
          {progress}% • Sorry dalane nggronjal
        </div>
      </motion.div>
    </motion.div>
  );
}
