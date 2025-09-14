import express from "express"
import mongoose from "mongoose"
import { z } from "zod"
import Node from "../models/Node.js"
import Edge from "../models/Edge.js"

const router = express.Router()

const coord = z.number().finite().refine(v => Math.abs(v) <= 10_000, "coord out of range")

const JSONAny = z.record(z.string(), z.unknown())

const optionalJsonObj = z.preprocess(
    (v) => (v == null ? undefined : v),
    JSONAny.optional()
)

const nodeCreate = z.object({
    label: z.string().trim().min(1).max(64).default("Node"),
    properties: JSONAny.default({}),
    x: coord.default(0),
    y: coord.default(0)
})
  
const nodeUpdate = z.object({
    label: z.string().trim().min(1).max(64).optional(),
    properties: optionalJsonObj,
    x: coord.optional(),
    y: coord.optional()
})
  
const edgeCreate = z.object({
    source: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid id"),
    target: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid id"),
    label: z.string().trim().min(1).max(64).default("relates_to"),
    properties: JSONAny.default({})
})
  
const edgeUpdate = z.object({
    label: z.string().trim().min(1).max(64).optional(),
    properties: optionalJsonObj
})

const objectId = z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid id")

function mustParse(schema, data, res) {
    const out = schema.safeParse(data)

    if (!out.success) {
        res.status(400).json({ error: "Validation failed", details: out.error.flatten() })
        return null
    }

    return out.data
}

router.get("/graph", async (_req, res) => {
    const [nodes, edges] = await Promise.all([Node.find().lean(), Edge.find().lean()])

    res.json({ nodes, edges })
})

router.post("/nodes", async (req, res) => {
    const body = mustParse(nodeCreate, req.body || {}, res); if (!body) return
    const node = await Node.create(body)
    
    res.status(201).json(node)
})

router.patch("/nodes/:id", async (req, res) => {
    const idOk = mustParse(objectId, req.params.id, res); if (!idOk) return
    const patch = mustParse(nodeUpdate, req.body || {}, res); if (!patch) return
    const node = await Node.findByIdAndUpdate(idOk, { $set: patch }, { new: true })

    if (!node) return res.sendStatus(404)
        
    res.json(node)
})

router.delete("/nodes/:id", async (req, res) => {
    const idOk = mustParse(objectId, req.params.id, res); if (!idOk) return
    const node = await Node.findByIdAndDelete(idOk)

    if (!node) return res.sendStatus(404)
    await Edge.deleteMany({ $or: [{ source: idOk }, { target: idOk }] })

    res.sendStatus(204)
})

router.post("/edges", async (req, res) => {
    const body = mustParse(edgeCreate, req.body || {}, res); if (!body) return

    if (body.source === body.target) return res.status(400).json({ error: "source and target must differ" })
    const count = await Node.countDocuments({ _id: { $in: [body.source, body.target] } })

    if (count !== 2) return res.status(400).json({ error: "source or target not found" })
    const edge = await Edge.create(body)

    res.status(201).json(edge)
})

router.patch("/edges/:id", async (req, res) => {
    const idOk = mustParse(objectId, req.params.id, res); if (!idOk) return
    const patch = mustParse(edgeUpdate, req.body || {}, res); if (!patch) return
    const edge = await Edge.findByIdAndUpdate(idOk, { $set: patch }, { new: true })

    if (!edge) return res.sendStatus(404)

    res.json(edge)
})

router.delete("/edges/:id", async (req, res) => {
    const idOk = mustParse(objectId, req.params.id, res); if (!idOk) return
    const edge = await Edge.findByIdAndDelete(idOk)

    if (!edge) return res.sendStatus(404)

    res.sendStatus(204)
})

export default router
