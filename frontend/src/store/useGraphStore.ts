import { create } from 'zustand'
import type { NodeT, EdgeT } from '../types'
import * as api from '../lib/api'

type Mode = 'idle' | 'connecting'

type State = {
    nodes: NodeT[]
    edges: EdgeT[]
    selected: { kind: 'node' | 'edge', id: string } | null
    mode: Mode
    search: string
    setMode: (m: Mode) => void
    setSearch: (q: string) => void
    load: () => Promise<void>
    addNode: (n: Partial<NodeT>) => Promise<NodeT>
    updateNode: (id: string, patch: Partial<NodeT>) => Promise<NodeT>
    removeNode: (id: string) => Promise<void>
    addEdge: (e: Partial<EdgeT>) => Promise<EdgeT>
    updateEdge: (id: string, patch: Partial<EdgeT>) => Promise<EdgeT>
    removeEdge: (id: string) => Promise<void>
    setSelected: (sel: State['selected']) => void
}

export const useGraphStore = create<State>((set, get) => ({
    nodes: [],
    edges: [],
    selected: null,
    mode: 'idle',
    search: '',
    setMode: (m) => set({ mode: m }),
    setSearch: (q) => set({ search: q }),
    setSelected: (sel) => set({ selected: sel }),

    load: async () => {
        const data = await api.fetchGraph()
        set({ nodes: data.nodes, edges: data.edges })
    },

    addNode: async (n) => {
        const created = await api.createNode(n)
        set({ nodes: [...get().nodes, created] })
        return created
    },

    updateNode: async (id, patch) => {
        const upd = await api.updateNode(id, patch)
        set({ nodes: get().nodes.map(n => n._id === id ? upd : n) })
        return upd
    },

    removeNode: async (id) => {
        await api.deleteNode(id)
        set({ 
        nodes: get().nodes.filter(n => n._id !== id),
        edges: get().edges.filter(e => e.source !== id && e.target !== id)
        })
    },

    addEdge: async (e) => {
        const created = await api.createEdge(e)
        set({ edges: [...get().edges, created] })
        return created
    },

    updateEdge: async (id, patch) => {
        const upd = await api.updateEdge(id, patch)
        set({ edges: get().edges.map(x => x._id === id ? upd : x) })
        return upd
    },

    removeEdge: async (id) => {
        await api.deleteEdge(id)
        set({ edges: get().edges.filter(e => e._id !== id) })
    }
}))
