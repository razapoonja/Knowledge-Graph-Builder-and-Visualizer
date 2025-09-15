const express = require("express");
const serveStatic = require("serve-static");
const client = require("prom-client");

const app = express();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.use(serveStatic("dist", { index: ["index.html"] }));

app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

const port = process.env.PORT || 5173;
app.listen(port, () => console.log(`frontend listening on :${port}`));
