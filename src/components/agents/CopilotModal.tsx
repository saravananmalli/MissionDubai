import { useState } from 'react';
import { Mic, Send, Sparkles, X } from 'lucide-react';
import { getCopilotReply, getQuickPrompts, resolveIntent, type CopilotIntent } from '@/domains/agents/copilotResponses';
import type { JourneyState } from '@/domains/journey/types';

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

interface CopilotModalProps {
  state: JourneyState;
  /** Which topic to open on, e.g. Agent 03's "Open Simulator" opens straight into interview prep. */
  initialIntent?: CopilotIntent;
  onClose: () => void;
}

/**
 * A real, working assistant modal — every reply is assembled from the
 * caller's own JourneyState (see copilotResponses.ts), never a live model
 * call. Tapping the mic simulates a voice turn end-to-end (listening →
 * reply) using the same real data rather than pretending to transcribe
 * speech we don't actually capture.
 */
export function CopilotModal({ state, initialIntent, onClose }: CopilotModalProps) {
  const quickPrompts = getQuickPrompts(state);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: getCopilotReply(state, initialIntent ?? quickPrompts[0]!.intent) }]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  function respond(userText: string, intent: CopilotIntent) {
    setMessages((prev) => [...prev, { role: 'user', text: userText }, { role: 'assistant', text: getCopilotReply(state, intent) }]);
  }

  function handleSend(text?: string, intent?: CopilotIntent) {
    const query = (text ?? inputText).trim();
    if (!query) return;
    respond(query, intent ?? resolveIntent(query));
    setInputText('');
  }

  function handleMicTap() {
    if (isListening) return;
    setIsListening(true);
    const topPrompt = quickPrompts[0]!;
    setTimeout(() => {
      respond(topPrompt.label, topPrompt.intent);
      setIsListening(false);
    }, 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
      <div className="flex max-h-[92vh] w-full max-w-sm flex-col rounded-3xl border border-[#593491] bg-[#140D24] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>Mission Copilot</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/30 bg-[#23153D] text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="my-3 flex flex-col items-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#EC4899] to-[#8B5CF6] shadow-[0_0_24px_rgba(236,72,153,0.5)] ${isListening ? 'animate-pulse' : ''}`}
          >
            <Mic className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-zinc-400" role="status">
            {isListening ? 'Listening…' : 'Ask about your mission'}
          </p>
        </div>

        <div className="my-2 max-h-56 space-y-2.5 overflow-y-auto rounded-2xl border border-purple-500/20 bg-[#0D0719] p-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`rounded-xl p-2.5 text-xs leading-relaxed ${
                message.role === 'assistant'
                  ? 'border border-purple-500/20 bg-[#1C1231] text-zinc-200'
                  : 'ml-6 border border-[#EC4899]/40 bg-gradient-to-r from-[#EC4899]/30 to-[#8B5CF6]/30 text-white'
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="scrollbar-none my-1 flex w-full items-center gap-1.5 overflow-x-auto pb-1">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.intent}
              type="button"
              onClick={() => handleSend(prompt.label, prompt.intent)}
              className="whitespace-nowrap rounded-full border border-purple-500/30 bg-[#1F1438] px-2.5 py-1 text-[10px] font-semibold text-zinc-300 transition-all hover:text-white active:scale-95"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex w-full items-center gap-2">
          <button
            type="button"
            onClick={handleMicTap}
            aria-label={isListening ? 'Listening' : 'Ask by voice'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95 ${
              isListening ? 'animate-pulse bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.8)]' : 'bg-gradient-to-tr from-[#EC4899] to-[#8B5CF6] text-white shadow-md'
            }`}
          >
            <Mic className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSend()}
              placeholder="Ask Copilot about your mission…"
              aria-label="Ask Copilot"
              className="w-full rounded-xl border border-purple-500/30 bg-[#120A21] py-2.5 pl-3 pr-8 text-xs text-white placeholder:text-zinc-500 focus:border-[#EC4899] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              aria-label="Send"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-pink-300"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
