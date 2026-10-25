
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Table",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    endTime: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    guests: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
        default: "Pending"
    },
    specialRequests: {
        type: String,
        trim: true
    }
}, { timestamps: true });

reservationSchema.pre("validate", function () {
    if (!this.startTime || !this.endTime) return;

    const [startHours, startMinutes] = this.startTime.split(":").map(Number);
    const [endHours, endMinutes] = this.endTime.split(":").map(Number);

    const start = startHours * 60 + startMinutes;
    const end = endHours * 60 + endMinutes;

    if (end - start !== 60) {
        this.invalidate("endTime", "A reservation must last exactly one hour.");
    }
});

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;