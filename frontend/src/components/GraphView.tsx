import { useEffect, useRef, useState } from 'react'
import { DataSet, Network, Node, Edge, Options } from 'vis-network/standalone/esm/vis-network'
import { useGraphStore } from '../store/useGraphStore'
import type { NodeT, EdgeT } from '../types'

const DEFAULT_NODE = { background: '#6366f1', border: '#312e81' }   // purple
const HIGHLIGHT_NODE = { background: '#ef4444', border: '#991b1b' } // red

export default function GraphView() {
    const containerRef = useRef<HTMLDivElement>(null)
    const networkRef = useRef<Network | null>(null)
    const visNodesRef = useRef(new DataSet<Node>([]))
    const visEdgesRef = useRef(new DataSet<Edge>([]))

    const nodes = useGraphStore(s => s.nodes)
    const edges = useGraphStore(s => s.edges)
    const search = useGraphStore(s => s.search)
    const addNode = useGraphStore(s => s.addNode)
    const updateNode = useGraphStore(s => s.updateNode)
    const removeNode = useGraphStore(s => s.removeNode)
    const addEdge = useGraphStore(s => s.addEdge)
    const updateEdge = useGraphStore(s => s.updateEdge)
    const removeEdge = useGraphStore(s => s.removeEdge)
    const setSelected = useGraphStore(s => s.setSelected)

    const [debouncedSearch, setDebouncedSearch] = useState(search)

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 200)
        return () => clearTimeout(t)
    }, [search])

    useEffect(() => {
        if (!containerRef.current) return

        const baseOptions: Options = {
            autoResize: true,
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.005,
                    springLength: 140,
                    springConstant: 0.12,
                    avoidOverlap: 0.6
                },
                stabilization: { enabled: true, iterations: 150 }
            },
            interaction: {
                hover: true,
                dragNodes: true,
                dragView: true,
                zoomView: true,
                multiselect: true,
                selectable: true
            },
            nodes: { font: { face: 'Inter', size: 14, color: '#0f172a' }, shape: 'dot', size: 16 },
            edges: { font: { align: 'horizontal', size: 10 }, color: '#94a3b8', smooth: { type: 'dynamic' } },
            manipulation: { enabled: true, initiallyActive: true, addNode: false }
        }

        const net = new Network(
            containerRef.current,
            { nodes: visNodesRef.current, edges: visEdgesRef.current },
            baseOptions
        )
        
        networkRef.current = net
        ;(window as any).__net = net

        net.setOptions({
            manipulation: {
              enabled: true,
              initiallyActive: true,
              addNode: false,
                addEdge: async (data, cb) => {
                    try {
                        const created = await addEdge({
                            source: String(data.from),
                            target: String(data.to),
                            label: data.label || 'relates_to'
                        })

                        cb({ ...data, id: created._id, label: created.label })
                    } catch {
                        cb(null)
                    }
                },
                editEdge: async (data, cb) => {
                    try {
                        await updateEdge(String(data.id), { label: data.label })

                        cb(data)
                    } catch {
                        cb(null)
                    }
                },
                deleteEdge: async (data, cb) => {
                    try {
                        const ids = (data.edges as string[]) || []
                        await Promise.all(ids.map(id => removeEdge(id)))

                        cb(data)
                    } catch {
                        cb(null)
                    }
                },
                deleteNode: async (data, cb) => {
                    try {
                        const ids = (data.nodes as string[]) || []
                        await Promise.all(ids.map(id => removeNode(id)))

                        cb(data)
                    } catch {
                        cb(null)
                    }
                }
            } as any
        })

        net.on('click', (params) => {
            if (params.nodes.length === 0 && params.edges.length === 0) {
                setSelected(null)
                return
            }
            if (params.nodes.length > 0) {
                const nid = params.nodes[0] as string
                setSelected({ kind: 'node', id: nid })
            } else if (params.edges.length > 0) {
                const eid = params.edges[0] as string
                setSelected({ kind: 'edge', id: eid })
            }
        })

        // right click to add node
        net.on('oncontext', async (params) => {
            params.event.preventDefault()
            const { x, y } = params.pointer.canvas

            try {
                const created = await addNode({ label: 'Node', x, y })
                visNodesRef.current.update({
                    id: created._id,
                    label: created.label,
                    x,
                    y,
                    color: DEFAULT_NODE,
                    shape: 'dot',
                    size: 16
                })

                networkRef.current?.selectNodes([created._id], false)
            } catch (e) {
              console.error(e)
            }
        })

        // persist node position
        net.on('dragEnd', async (params) => {
            const nid = params.nodes?.[0] as string | undefined

            if (!nid) return
            const pos = net.getPosition(nid)

            try {
                await updateNode(nid, { x: pos.x, y: pos.y })
            } catch {}
        })

        // keyboard Delete
        const onKey = async (e: KeyboardEvent) => {
            if (e.key !== 'Delete') return
            const selEdges = net.getSelectedEdges() as string[]
            const selNodes = net.getSelectedNodes() as string[]
            try {
                if (selEdges.length) await Promise.all(selEdges.map(id => removeEdge(id)))
                else if (selNodes.length) await Promise.all(selNodes.map(id => removeNode(id)))
            } catch {}
        }

        document.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('keydown', onKey)
            net.destroy()
        }
    }, [addEdge, addNode, removeEdge, removeNode, setSelected, updateEdge, updateNode])

    useEffect(() => {
        const ds = visNodesRef.current
        const existing = new Set<string>(ds.getIds() as string[])
        const incoming = new Set<string>(nodes.map(n => n._id))

        const toRemove = [...existing].filter(id => !incoming.has(id))
        if (toRemove.length) ds.remove(toRemove)

        const payload: Node[] = nodes.map(n => ({
            id: n._id,
            label: n.label,
            x: n.x,
            y: n.y,
            physics: true,
            shape: 'dot',
            size: 16,
            color: DEFAULT_NODE
        }))

        ds.update(payload)
    }, [nodes])

    useEffect(() => {
        const ds = visEdgesRef.current
        const existing = new Set<string>(ds.getIds() as string[])
        const incoming = new Set<string>(edges.map(e => e._id))
        const toRemove = [...existing].filter(id => !incoming.has(id))

        if (toRemove.length) ds.remove(toRemove)

        const payload: Edge[] = edges.map(e => ({
            id: e._id,
            from: e.source,
            to: e.target,
            label: e.label,
            arrows: 'to',
            smooth: { type: 'dynamic' } as any
        }))

        ds.update(payload)
    }, [edges])

    useEffect(() => {
        const q = (debouncedSearch || '').trim().toLowerCase()
        const ds = visNodesRef.current
        const all = ds.get() as Node[]
        const updates: Node[] = all.map(n => ({
            id: n.id!,
            color: q && String(n.label || '').toLowerCase().includes(q) ? HIGHLIGHT_NODE : DEFAULT_NODE
        }))

        ds.update(updates)
    }, [debouncedSearch])

    return (
        <div className="flex-1 relative">
            <div ref={containerRef} className="absolute inset-0" />
        </div>
    )
}

function Toolbar() {
    const fit = () => {
        const net = (window as any).__net as Network | null
        if (net) net.fit({ animation: { duration: 300 } })
    }

    return (
        <div className="ml-auto flex items-center gap-2">
            <button onClick={fit} className="rounded-md border px-3 py-2">Fit</button>
        </div>
    )
}

(GraphView as any).Toolbar = Toolbar

export { Toolbar as GraphViewToolbar }
