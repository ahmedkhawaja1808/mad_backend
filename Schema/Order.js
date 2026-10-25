import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    orderItems: [
        {
            menuItem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MenuItem",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    deliveryAddress: {
        type: String,
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ["Cash On Delivery", "Online"],
        default: "Online"
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending"
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Preparing", "Ready", "Completed", "Cancelled"],
        default: "Pending"
    }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
export default Order;