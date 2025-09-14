import "dotenv/config";
import mongoose from "mongoose";
import Node from "../src/models/Node.js";
import Edge from "../src/models/Edge.js";
import { connect } from "../src/db.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/depoiq";

async function seed() {
    await connect(MONGO_URI);
    await Promise.all([Node.deleteMany({}), Edge.deleteMany({})]);

    const labels = [
        "Alice","Bob","Carol","Dave","Eve","Frank",
        "Product A","Product B","Company X","Company Y",
        "City One","City Two"
    ];

    const coords = [
        [-200, -120], [-40, -80], [120, -110], [240, -20], [160, 80], [20, 100],
        [-220, 40], [-260, 160], [-100, 160], [60, 180], [200, 180], [-140, 0]
    ];

    const nodes = await Node.insertMany(labels.map((label, i) => ({
        label,
        properties: { type: i < 6 ? "Person" : (i < 8 ? "Product" : (i < 10 ? "Company" : "City")) },
        x: coords[i][0],
        y: coords[i][1]
    })));

    const byLabel = Object.fromEntries(nodes.map(n => [n.label, n]));

    const makeEdge = (a, b, label="relates_to") => ({ source: byLabel[a]._id, target: byLabel[b]._id, label, properties: {} });

    const edges = [
        makeEdge("Alice", "Bob", "knows"),
        makeEdge("Alice", "Carol", "knows"),
        makeEdge("Bob", "Dave", "knows"),
        makeEdge("Carol", "Eve", "knows"),
        makeEdge("Eve", "Frank", "knows"),
        makeEdge("Alice", "Product A", "bought"),
        makeEdge("Bob", "Product B", "bought"),
        makeEdge("Company X", "Product A", "makes"),
        makeEdge("Company Y", "Product B", "makes"),
        makeEdge("City One", "Company X", "located_in"),
        makeEdge("City Two", "Company Y", "located_in"),
        makeEdge("Dave", "Company X", "works_at"),
        makeEdge("Frank", "Company Y", "works_at")
    ];

    await Edge.insertMany(edges);
    console.log("Seeded nodes:", nodes.length, "edges:", edges.length);
    await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
