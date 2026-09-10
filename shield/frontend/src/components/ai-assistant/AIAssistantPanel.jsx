import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { X, Bot, Send, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import { closeAIAssistant } from '../../store/slices/uiSlice'

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    content: 'Hello! I am your Conveyor AI Assistant. I continuously correlate real-time telemetry (temperatures, vibrations, currents) with optical camera detections. How can I help you evaluate conveyor health today?',
  },
]

// TODO: joints out of scope for now, see theme.md §5.3 — removed 'Explain Joint-04 delamination fault'
const QUICK_PROMPTS = [
  'Why is Belt Temp trending upwards?',
  'Summarise latest surface defect detections',
  'What is current estimated RUL for CB-001?',
  'Recommend maintenance schedule for shift',
]

export default function AIAssistantPanel() {
  const dispatch = useDispatch()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async (customText) => {
    const text = (customText || input).trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text }])
    setLoading(true)

    // Simulating RAG diagnostic reasoning
    await new Promise(r => setTimeout(r, 700))
    
    // TODO: joints out of scope for now, see theme.md §5.3 — replaced Joint-04 diagnosis with surface inspection
    if (text.toLowerCase().includes('delamination') || text.toLowerCase().includes('surface') || text.toLowerCase().includes('defect')) {
      answer = `Belt Surface Inspection Diagnosis:\n• Delamination area: 142 mm² along trailing belt edge (840m station).\n• Optical Confidence: 94.2% via line-scan vision.\n• Transducer Correlation: TT-101 shows localized +3.4°C thermal elevation.\n• Guidance: Schedule cold-vulcanized repair patch within 48h before crack propagation.`
    } else if (text.toLowerCase().includes('temp')) {
      answer = `Thermal Telemetry Assessment:\n• Belt surface reading: 25.4°C (Normal operating envelope is 15°C–32°C).\n• Motor winding: 38.7°C (Nominal rating is < 42°C).\n• Normal slight rise due to 1,850 TPH ore throughput.`
    } else if (text.toLowerCase().includes('rul')) {
      // TODO: joints out of scope for now, see theme.md §5.3 — removed Joint-04 specific RUL text
      answer = `Remaining Useful Life (RUL) Projection:\n• Estimated Belt Lifetime: 147 operating hours remaining before recommended maintenance.\n• Primary Wear Zone: Trailing edge, 840 m from head drum (confidence 91%).\n• Recommended Service Window: At or before 72 hours remaining.`
    } else {
      answer = `Telemetry vector reviewed. All 4 sensor channels (TT-101, TT-102, VT-201, CT-301) are reporting healthy readings. Isolation Forest anomaly score is 0.042 (well within normal threshold).`
    }

    setMessages(prev => [
      ...prev,
      {
        id: Date.now() + 1,
        role: 'assistant',
        content: answer,
      },
    ])
    setLoading(false)
  }

  return (
    <aside
      className="flex flex-col w-96 h-full flex-shrink-0 z-30 relative"
      style={{
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
            style={{ 
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '1px solid var(--color-accent-border)'
            }}
          >
            <Sparkles size={18} color="var(--color-accent)" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-display font-semibold text-main">Conveyor Assistant</span>
              <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
            </div>
            <span className="text-[11px] font-tech text-muted">AI Diagnostic Copilot</span>
          </div>
        </div>

        <button
          className="p-1.5 rounded-lg hover:bg-white/5 text-muted transition-colors cursor-pointer"
          onClick={() => dispatch(closeAIAssistant())}
          aria-label="Close AI assistant"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line shadow-sm ${
                msg.role === 'user' ? 'font-tech font-medium rounded-tr-sm' : 'font-normal rounded-tl-sm'
              }`}
              style={{
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: 'var(--color-text-main)',
                border: `1px solid ${msg.role === 'user' ? 'var(--color-accent-border)' : 'var(--color-border-subtle)'}`,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div 
              className="p-3.5 rounded-2xl rounded-tl-sm text-xs flex items-center gap-2 font-tech"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-accent)' }}
            >
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-xs text-muted">Analyzing telemetry vectors...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-5 py-3.5 border-t space-y-2 flex-shrink-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <span className="text-[11px] font-tech uppercase tracking-wider font-semibold text-muted block">Suggested Diagnostics:</span>
        <div className="flex flex-col gap-1.5">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-left text-xs p-2.5 rounded-xl border transition-all hover:border-accent/40 hover:bg-white/[0.03] flex items-center justify-between group cursor-pointer"
              style={{ background: 'rgba(255, 255, 255, 0.015)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
            >
              <span className="group-hover:text-main transition-colors font-tech text-xs truncate">{p}</span>
              <ArrowRight size={12} className="text-dim group-hover:text-accent transform group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border"
          style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--color-border)' }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask AI Copilot about telemetry or defects..."
            className="flex-1 bg-transparent text-xs font-tech outline-none text-main placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-md"
            style={{ background: 'var(--color-accent)', color: '#080E1A' }}
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </aside>
  )
}
