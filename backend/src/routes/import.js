import express from "express";
import Node from "../models/Node.js";
import Edge from "../models/Edge.js";

const router = express.Router();

router.post("/import", async (req, res) => {
    const { nodes = [], edges = [], root_entity_name = "" } = req.body || {};
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const pickLabel = (n) => {
        if (Array.isArray(n.labels) && n.labels.length) return String(n.labels[0]);
        if (n?.properties?.name) return String(n.properties.name);
        if (n?.properties?.title) return String(n.properties.title);
        return "Node";
    };

    const labelToId = new Map();
    for (const n of nodes) {
        const label = pickLabel(n);
        const props = (n && typeof n.properties === "object" && n.properties) || {};
        const existing = await Node.findOne({ label });

        if (existing) {
            const mergedProps = { ...(existing.properties || {}), ...props };
            const updated = await Node.findByIdAndUpdate(
                existing._id,
                { $set: { properties: mergedProps } },
                { new: true }
            );

            labelToId.set(label, String(updated._id));
        } else {
            const created = await Node.create({ label, properties: props });
            labelToId.set(label, String(created._id));
        }
    }

    const ensureNode = async (label) => {
        if (labelToId.has(label)) return labelToId.get(label);
        let found = await Node.findOne({ label });

        if (!found) found = await Node.create({ label, properties: {} });
        labelToId.set(label, String(found._id));

        return String(found._id);
    };

    let createdEdges = 0;
    for (const triplet of edges) {
        if (!Array.isArray(triplet) || triplet.length < 3) continue;

        const [srcLabel, tgtLabel, relation] = triplet.map(String);
        const source = await ensureNode(srcLabel);
        const target = await ensureNode(tgtLabel);

        const dup = await Edge.findOne({ source, target, label: relation });
        if (!dup) {
            await Edge.create({ source, target, label: relation, properties: {} });
            createdEdges += 1;
        }
    }

    const rootId = labelToId.get(root_entity_name) || null;

    res.json({
        status: "ok",
        nodeCount: labelToId.size,
        createdEdges,
        rootId,
    });
});

export default router;
