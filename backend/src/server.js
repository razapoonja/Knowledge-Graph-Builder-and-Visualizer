import "dotenv/config"
import express from "express"
import morgan from "morgan"
import { connect } from "./db.js"
import graphRoutes from "./routes/graph.js"
import { applySecurity } from "./security.js"
import importRoutes from "./routes/import.js";

const app = express()
app.set("trust proxy", 1)

applySecurity(app)

app.use(express.json({ limit: "100kb" }))
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

app.get("/health", (_req, res) => res.json({ ok: true }))
app.use("/", graphRoutes)
app.use("/", importRoutes);

app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(400).json({ error: err.message || "Bad Request" })
})

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/depoiq"

connect(MONGO_URI).then(() => {
    app.listen(PORT, () => console.log(`API listening on :${PORT}`))
}).catch((err) => {
    console.error("Mongo error", err)
    process.exit(1)
})
