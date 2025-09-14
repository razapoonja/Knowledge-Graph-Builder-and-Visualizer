import axios from 'axios'
import type { NodeT, EdgeT, ExtractedKG } from '../types'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const http = axios.create({ baseURL })

export async function fetchGraph(): Promise<{nodes: NodeT[], edges: EdgeT[]}> {
    const { data } = await http.get('/graph')
    return data
}

export async function createNode(payload: Partial<NodeT>) {
    const { data } = await http.post('/nodes', payload)
    return data as NodeT
}

export async function updateNode(id: string, payload: Partial<NodeT>) {
    const { data } = await http.patch(`/nodes/${id}`, payload)
    return data as NodeT
}

export async function deleteNode(id: string) {
    await http.delete(`/nodes/${id}`)
}

export async function createEdge(payload: Partial<EdgeT>) {
    const { data } = await http.post('/edges', payload)
    return data as EdgeT
}

export async function updateEdge(id: string, payload: Partial<EdgeT>) {
    const { data } = await http.patch(`/edges/${id}`, payload)
    return data as EdgeT
}

export async function deleteEdge(id: string) {
    await http.delete(`/edges/${id}`)
}

export async function importGraphKg(kg: ExtractedKG) {
    const { data } = await http.post('/import', kg)
    return data as { status: string; nodeCount: number; createdEdges: number; rootId: string | null }
}