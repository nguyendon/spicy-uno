import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../common/Button';

type RuleType = 'behavioral' | 'speech' | 'penalty' | 'action';

interface CustomRuleModalProps {
  onSubmit: (text: string, type: RuleType) => void;
}

const SUGGESTIONS = [
  { text: 'Must speak in an accent', type: 'behavioral' as RuleType },
  { text: "Can't use the word 'card'", type: 'speech' as RuleType },
  { text: 'Draw 2 if you touch your face', type: 'penalty' as RuleType },
  { text: 'Must knock before drawing', type: 'action' as RuleType },
  { text: 'No pointing at people', type: 'behavioral' as RuleType },
  { text: 'Must say "thank you" when drawing', type: 'speech' as RuleType },
];

export function CustomRuleModal({ onSubmit }: CustomRuleModalProps) {
  const [ruleText, setRuleText] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('behavioral');

  const handleSubmit = () => {
    if (ruleText.trim()) {
      onSubmit(ruleText.trim(), ruleType);
    }
  };

  const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
    setRuleText(suggestion.text);
    setRuleType(suggestion.type);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">📝</div>
          <h2 className="text-2xl font-bold text-white">Create a House Rule!</h2>
          <p className="text-gray-400 mt-2">
            You played a 0! Create a new rule everyone must follow.
          </p>
        </div>

        {/* Suggestions */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Quick suggestions:</label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>

        {/* Rule input */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Your rule:</label>
          <textarea
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            placeholder="Enter your custom rule..."
            maxLength={100}
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={3}
          />
          <div className="text-right text-gray-500 text-sm mt-1">
            {ruleText.length}/100
          </div>
        </div>

        {/* Rule type */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Rule type:</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'behavioral' as RuleType, label: 'Behavioral', emoji: '🎭' },
              { type: 'speech' as RuleType, label: 'Speech', emoji: '💬' },
              { type: 'penalty' as RuleType, label: 'Penalty', emoji: '⚠️' },
              { type: 'action' as RuleType, label: 'Action', emoji: '🎬' },
            ].map(({ type, label, emoji }) => (
              <button
                key={type}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                  ruleType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => setRuleType(type)}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          variant="success"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={!ruleText.trim()}
        >
          Set Rule
        </Button>
      </motion.div>
    </motion.div>
  );
}
