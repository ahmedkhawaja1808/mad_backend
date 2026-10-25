import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
    tableNumber: {
        type: Number,
        required: true,
        unique: true
    },
    seats: {
        type: Number,
        required: true,
        default: 1
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Table = mongoose.model("Table", tableSchema);
export default Table;