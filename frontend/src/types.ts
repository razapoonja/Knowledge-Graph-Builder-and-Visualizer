export type NodeT = {
    _id: string
    label: string
    properties?: Record<string, any>
    x?: number
    y?: number
}

export type EdgeT = {
    _id: string
    label: string
    properties?: Record<string, any>
    source: string
    target: string
}

export type ExtractedKG = {
    nodes: Array<{ labels: string[]; properties: Record<string, any> }>;
    edges: [string, string, string][];
    root_entity_name: string;
}