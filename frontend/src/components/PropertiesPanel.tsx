import { useEffect, useMemo, useState } from 'react'
import { useGraphStore } from '../store/useGraphStore'

export default function PropertiesPanel() {
    const sel = useGraphStore(s => s.selected)
    const nodes = useGraphStore(s => s.nodes)
    const edges = useGraphStore(s => s.edges)
    const updateNode = useGraphStore(s => s.updateNode)
    const updateEdge = useGraphStore(s => s.updateEdge)

    const obj = useMemo(() => {
        if (!sel) return null
        if (sel.kind === 'node') return nodes.find(n => n._id === sel.id) || null
        return edges.find(e => e._id === sel.id) || null
    }, [sel, nodes, edges])

    const isNode = sel?.kind === 'node'

    const [label, setLabel] = useState<string>('')
    const [propsText, setPropsText] = useState<string>('{}')
    const [jsonError, setJsonError] = useState<string>('')

    useEffect(() => {
        if (!obj) return
        setLabel((obj as any).label || '')
        setPropsText(JSON.stringify((obj as any).properties || {}, null, 2))
        setJsonError('')
    }, [obj?.['_id']])

    if (!obj) {
        return (
        <div className="p-4">
            <h3 className="font-semibold mb-2">Properties</h3>
            <p className="text-sm text-slate-600">Select a node or edge to edit.</p>
        </div>
        )
    }

    const persistLabel = async () => {
        if (!sel) return
        try {
            if (isNode) await updateNode(sel.id, { label })
            else await updateEdge(sel.id, { label })
        } catch {}
    }

    const persistProps = async () => {
        if (!sel) return
        try {
            const val = propsText.trim() ? JSON.parse(propsText) : {}
            setJsonError('')
            if (isNode) await updateNode(sel.id, { properties: val })
            else await updateEdge(sel.id, { properties: val as any })
        } catch (e: any) {
            setJsonError('Invalid JSON')
        }
    }

    const onPropsKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            await persistProps()
        }
    }

    const onLabelKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            await persistLabel()
            ;(e.target as HTMLInputElement).blur()
        }
    }

    return (
        <div className="p-4 space-y-3">
            <h3 className="font-semibold">{isNode ? 'Node' : 'Edge'} Properties</h3>

            <div className="space-y-1">
                <label className="text-sm text-slate-600">Label</label>
                <input
                    className="w-full rounded-md border px-3 py-2"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={persistLabel}
                    onKeyDown={onLabelKeyDown}
                />

                <p className="text-xs text-slate-500">Press Enter to save label</p>
            </div>

            <div className="space-y-1">
                <label className="text-sm text-slate-600">Properties JSON</label>
                <textarea
                    className="w-full h-[220px] rounded-md border p-2 font-mono text-sm"
                    value={propsText}
                    onChange={(e) => setPropsText(e.target.value)}
                    onBlur={persistProps}
                    onKeyDown={onPropsKeyDown}
                />

                {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
                <p className="text-xs text-slate-500">Ctrl Enter to save</p>
            </div>
        </div>
    )
}
