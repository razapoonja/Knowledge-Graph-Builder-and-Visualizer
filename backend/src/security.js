import helmet from "helmet"
import cors from "cors"
import rateLimit from "express-rate-limit"
import mongoSanitize from "express-mongo-sanitize"
import hpp from "hpp"

function parseOrigins(str) {
    if (!str) return []
    return str.split(",").map(s => s.trim()).filter(Boolean)
}

export function applySecurity(app) {
    const ALLOWLIST = parseOrigins(process.env.CORS_ORIGIN || "http://localhost:5173")

    app.disable("x-powered-by")
    app.use(helmet({ contentSecurityPolicy: false }))

    app.use(cors({
        origin(origin, cb) {
        if (!origin) return cb(null, true)
            cb(ALLOWLIST.includes(origin) ? null : new Error("Not allowed by CORS"), ALLOWLIST.includes(origin))
        },

        credentials: false,
        methods: ["GET","POST","PATCH","DELETE","OPTIONS"],
        allowedHeaders: ["Content-Type","Accept","X-Requested-With"]
    }))

    app.use((req, res, next) => {
        const m = req.method.toUpperCase()
        if (!["POST","PUT","PATCH"].includes(m)) return next()

        const ct = (req.headers["content-type"] || "").toLowerCase()

        if (!ct.includes("application/json")) {
            return res.status(415).json({ error: "Use application/json" })
        }
        next()
    })

    app.use(mongoSanitize())
    app.use(hpp())

    app.use(rateLimit({
        windowMs: 60_000,
        limit: 120,
        standardHeaders: "draft-7",
        legacyHeaders: false
    }))

    const writeLimiter = rateLimit({ windowMs: 60_000, limit: 60 })
    app.use(["/nodes", "/edges"], writeLimiter)

    // CSRF
    app.use((req, res, next) => {
        if (!["POST","PUT","PATCH","DELETE"].includes(req.method)) return next()
        const hdr = req.headers.origin || req.headers.referer
    
        if (!hdr) return res.status(403).json({ error: "Missing Origin" })

        try {
            const u = new URL(hdr)
            const origin = `${u.protocol}//${u.host}`
            if (!ALLOWLIST.includes(origin)) return res.status(403).json({ error: "CSRF check failed" })

            next()
        } catch {
            return res.status(403).json({ error: "Invalid Origin" })
        }
    })
}
