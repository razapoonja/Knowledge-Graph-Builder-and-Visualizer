import mongoose from "mongoose";

const PropertySchema = new mongoose.Schema({}, { strict: false, _id: false });

const EdgeSchema = new mongoose.Schema(
    {
        label: { type: String, default: "relates_to" },
        properties: { type: PropertySchema, default: {} },
        source: { type: mongoose.Schema.Types.ObjectId, ref: "Node", required: true },
        target: { type: mongoose.Schema.Types.ObjectId, ref: "Node", required: true }
    },
    { timestamps: true }
);

EdgeSchema.index({ source: 1 });
EdgeSchema.index({ target: 1 });

export default mongoose.model("Edge", EdgeSchema);
