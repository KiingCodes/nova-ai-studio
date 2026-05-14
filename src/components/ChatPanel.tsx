import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}

const ChatPanel = ({ isOpen, onClose, onCommand }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'I can help you edit your project. Try commands like:\n\n• "Make it more premium"\n• "Add a pricing section"\n• "Change colors to dark theme"\n• "Improve the typography"' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const cmd = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: cmd }, { role: 'assistant', content: '✨ Applying your changes — regenerating with AI…' }]);
    setInput('');
    onCommand(cmd);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full sm:w-[380px] h-full glass-panel-strong flex flex-col border-l border-border/50"
        >
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Edit with Chat</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a command..."
                className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
              <button
                onClick={handleSend}
                className="p-3 rounded-xl gradient-gold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
