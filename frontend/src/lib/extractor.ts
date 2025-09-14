import axios from 'axios'
import type { ExtractedKG } from '../types'

const extractor = axios.create({
    baseURL: import.meta.env.VITE_EXTRACTOR_URL || 'http://localhost:8000'
})

export async function extractFromPdf(file: File): Promise<ExtractedKG> {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await extractor.post('/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })

    return data
}

export async function extractFromText(text: string, docClass = 'resume'): Promise<ExtractedKG> {
    const { data } = await extractor.post('/extract-text', { text, doc_class: docClass })

    return data
  }
