import mongoose from "mongoose";

const PropertySchema = new mongoose.Schema({}, { strict: false, _id: false });

const NodeSchema = new mongoose.Schema(
    {
        label: { type: String, default: "Node" },
        properties: { type: PropertySchema, default: {} },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    },
    { timestamps: true }
);

export default mongoose.model("Node", NodeSchema);
