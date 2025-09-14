import { useState } from 'react'
import { useGraphStore } from '../store/useGraphStore'
import { extractFromPdf, extractFromText } from '../lib/extractor'
import { importGraphKg } from '../lib/api'
import type { Network } from 'vis-network/standalone/esm/vis-network'

export default function ImportPanel({ onClose }: { onClose: () => void }) {
    const load = useGraphStore(s => s.load)
    const [mode, setMode] = useState<'pdf' | 'text'>('pdf')
    const [file, setFile] = useState<File | null>(null)
    const [text, setText] = useState('')
    const [docClass, setDocClass] = useState('resume')
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string>('')

    const doImport = async () => {
        try {
            setBusy(true)
            setMsg('Extracting…')
            let kg

            if (mode === 'pdf') {
                if (!file) return setMsg('Choose a PDF first.')
                kg = await extractFromPdf(file)
            } else {
                if (!text.trim()) return setMsg('Enter some text.')
                kg = await extractFromText(text, docClass)
            }

            setMsg('Saving to database…')
            const res = await importGraphKg(kg)

            setMsg('Refreshing graph…')
            await load()

            if (res.rootId) {
                const net = (window as any).__net as Network | null

                if (net) {
                    net.selectNodes([res.rootId])
                    net.focus(res.rootId, { scale: 1.2, animation: { duration: 400 } })
                }
            }

            setMsg('Done.')
            onClose()
        } catch (e: any) {
            setMsg(e?.response?.data?.detail || e?.message || 'Failed.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="absolute top-14 left-3 z-20 w-[520px] rounded-xl border bg-white shadow-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold">Import from PDF / Text</div>
                <button onClick={onClose} className="text-sm px-2 py-1 border rounded-md">Close</button>
            </div>

            <div className="p-4 space-y-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('pdf')}
                        className={`px-3 py-1 rounded-md border ${mode==='pdf'?'bg-slate-100':''}`}
                    >PDF</button>
                    <button
                        onClick={() => setMode('text')}
                        className={`px-3 py-1 rounded-md border ${mode==='text'?'bg-slate-100':''}`}
                    >Text</button>
                </div>

                {mode === 'pdf' ? (
                <div className="space-y-2">
                    <label className="text-sm text-slate-600">Upload PDF</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
                ) : (
                <div className="space-y-2">
                    <label className="text-sm text-slate-600">Text</label>
                    <textarea
                    className="w-full h-40 rounded-md border p-2"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    />

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">doc_class</span>
                        <input
                            className="rounded-md border px-2 py-1 text-sm"
                            value={docClass}
                            onChange={(e) => setDocClass(e.target.value)}
                        />
                    </div>
                </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        disabled={busy}
                        onClick={doImport}
                        className="px-3 py-2 rounded-md border bg-slate-900 text-white disabled:opacity-60"
                    >
                        {busy ? 'Working…' : 'Import'}
                    </button>
                    <span className="text-sm text-slate-600">{msg}</span>
                </div>
            </div>
        </div>
    )
}
