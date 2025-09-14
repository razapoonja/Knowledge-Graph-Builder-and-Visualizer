import { useEffect, useRef, useState } from 'react'
import { queryDocument } from '../lib/extractor'

type Msg = { role: 'user' | 'assistant'; text: string }

export default function DocChat({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = useState<Msg[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMessages([{ role: 'assistant', text: 'Ask anything about your uploaded PDF' }])
    }, [])

    useEffect(() => {
        listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
    }, [messages])

    const send = async () => {
        const q = input.trim()

        if (!q || busy) return
        setInput('')
        setMessages(prev => [...prev, { role: 'user', text: q }])

        try {
            setBusy(true)
            const answer = await queryDocument(q)
            setMessages(prev => [...prev, { role: 'assistant', text: answer || 'No answer' }])
        } catch (e: any) {
            const err = e?.response?.data?.detail || e?.message || 'Failed'
            setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err}` }])
        } finally {
            setBusy(false)
        }
    }

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
        }
    }

    return (
        <div className="absolute top-14 right-3 z-30 w-[520px] h-[540px] rounded-xl border bg-white shadow-md flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold">Chat with Document</div>
                <button onClick={onClose} className="text-sm px-2 py-1 border rounded-md">Close</button>
            </div>

            <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3">
                {messages.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    {m.text}
                </div>
                ))}
            </div>

            <div className="p-3 border-t flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Type your question and press Enter"
                    className="flex-1 rounded-md border px-3 py-2"
                />
                <button
                    onClick={send}
                    disabled={busy || !input.trim()}
                    className="rounded-md border px-3 py-2 bg-slate-900 text-white disabled:opacity-60"
                >
                    {busy ? 'Sending' : 'Send'}
                </button>
            </div>
        </div>
    )
}
