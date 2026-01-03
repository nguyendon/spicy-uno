import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../../types/game.types';

interface SilenceReporterProps {
  active: boolean;
  players: Player[];
  currentPlayerId: string;
  onReport: (targetId: string) => void;
}

export function SilenceReporter({
  active,
  players,
  currentPlayerId,
  onReport,
}: SilenceReporterProps) {
  const otherPlayers = players.filter((p) => p.id !== currentPlayerId);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed top-20 right-4 z-30"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-red-500/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤫</span>
              <div>
                <h3 className="text-white font-bold">Silence Mode</h3>
                <p className="text-gray-400 text-xs">Report anyone who speaks!</p>
              </div>
            </div>

            <div className="space-y-2">
              {otherPlayers.map((player) => (
                <motion.button
                  key={player.id}
                  className="w-full flex items-center justify-between bg-gray-700 hover:bg-red-600/80 px-3 py-2 rounded-lg transition-colors group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onReport(player.id)}
                >
                  <span className="text-white">{player.name}</span>
                  <span className="text-gray-400 group-hover:text-white text-sm">
                    Report 👆
                  </span>
                </motion.button>
              ))}
            </div>

            <p className="text-gray-500 text-xs mt-3 text-center">
              Tap to make them draw a card
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
