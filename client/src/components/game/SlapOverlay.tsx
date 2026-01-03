import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SlapOverlayProps {
  onSlap: () => void;
  deadline?: number;
}

export function SlapOverlay({ onSlap, deadline = Date.now() + 3000 }: SlapOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(3);
  const [hasSlapped, setHasSlapped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [deadline]);

  const handleSlap = () => {
    if (!hasSlapped) {
      setHasSlapped(true);
      onSlap();
    }
  };

  const progress = timeLeft / 3;

  return (
    <motion.div
      className="fixed inset-0 bg-red-900/40 flex items-center justify-center z-40 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-center pointer-events-auto">
        <motion.div
          className="text-6xl font-bold text-white mb-8"
          animate={{
            scale: [1, 1.1, 1],
            textShadow: [
              '0 0 20px rgba(255,0,0,0.5)',
              '0 0 40px rgba(255,0,0,0.8)',
              '0 0 20px rgba(255,0,0,0.5)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          5 PLAYED! SLAP!
        </motion.div>

        {/* Countdown ring */}
        <div className="relative inline-block mb-8">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="10"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#FF4444"
              strokeWidth="10"
              strokeDasharray={565}
              strokeDashoffset={565 * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-white">{timeLeft.toFixed(1)}s</span>
          </div>
        </div>

        {/* Slap button */}
        {!hasSlapped ? (
          <motion.button
            className="bg-red-600 hover:bg-red-500 text-white text-4xl font-bold px-16 py-8 rounded-full shadow-2xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(255,0,0,0.5)',
                '0 0 60px rgba(255,0,0,0.8)',
                '0 0 20px rgba(255,0,0,0.5)',
              ],
            }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            onClick={handleSlap}
          >
            SLAP!
          </motion.button>
        ) : (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl text-green-400 font-bold"
          >
            SLAPPED!
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
