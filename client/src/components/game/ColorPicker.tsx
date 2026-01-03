import { motion } from 'framer-motion';
import type { CardColor } from '../../types/game.types';

interface ColorPickerProps {
  onSelect: (color: CardColor) => void;
  onCancel: () => void;
}

const COLORS: { color: CardColor; bg: string; label: string }[] = [
  { color: 'red', bg: 'bg-red-500 hover:bg-red-600', label: 'Red' },
  { color: 'yellow', bg: 'bg-yellow-400 hover:bg-yellow-500', label: 'Yellow' },
  { color: 'green', bg: 'bg-green-500 hover:bg-green-600', label: 'Green' },
  { color: 'blue', bg: 'bg-blue-500 hover:bg-blue-600', label: 'Blue' },
];

export function ColorPicker({ onSelect, onCancel }: ColorPickerProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-gray-800 rounded-2xl p-6 shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-6">Choose a Color</h2>

        <div className="grid grid-cols-2 gap-4">
          {COLORS.map(({ color, bg, label }) => (
            <motion.button
              key={color}
              className={`${bg} w-32 h-32 rounded-xl text-white font-bold text-xl shadow-lg transition-transform`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(color)}
            >
              {label}
            </motion.button>
          ))}
        </div>

        <button
          className="mt-6 w-full py-3 text-gray-400 hover:text-white transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
