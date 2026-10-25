import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    category: {
        type: String,
        required: true,
        enum: ["Mains", "Starters", "Desserts", "Drinks", "Sides"]
    },
    image: {
        url: {
            type: String,
            default:""
        },
        public_id: {
            type: String,
            default: ""
        }
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Menu = mongoose.model("MenuItem", menuSchema);
export default Menu;