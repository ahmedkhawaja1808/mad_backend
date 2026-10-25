import Reservation from "../Schema/Reservation.js";
import Table from "../Schema/Table.js";
import User from "../Schema/User.js";

export const createReservation = async (req, res) => {
    try {
        const { table, date, startTime, guests, specialRequests } = req.body;

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        if (!table || !date || !startTime || guests === undefined) {
            return res.status(400).json({
                success: false,
                message: "Please provide table, date, start time, and number of guests"
            });
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid start time format. Use HH:mm"
            });
        }

        const reservationDate = new Date(date);

        if (Number.isNaN(reservationDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation date"
            });
        }

        const guestCount = Number(guests);

        if (!Number.isInteger(guestCount) || guestCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Guests must be a positive integer"
            });
        }

        const [hours, minutes] = startTime.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + 60;

        if (endMinutes > 24 * 60) {
            return res.status(400).json({
                success: false,
                message: "Reservations cannot extend beyond midnight"
            });
        }

        const endTime =
            `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:` +
            `${String(endMinutes % 60).padStart(2, "0")}`;

        const now = new Date();
        const reservationStart = new Date(reservationDate);
        reservationStart.setHours(hours, minutes, 0, 0);

        if (reservationStart <= now) {
            return res.status(400).json({
                success: false,
                message: "Reservation must be in the future"
            });
        }

        const selectedTable = await Table.findById(table);

        if (!selectedTable) {
            return res.status(404).json({
                success: false,
                message: "Table not found"
            });
        }

        if (selectedTable.isAvailable === false) {
            return res.status(400).json({
                success: false,
                message: "This table is not available"
            });
        }

        if (guestCount > selectedTable.seats) {
            return res.status(400).json({
                success: false,
                message: `This table can accommodate only ${selectedTable.seats} guests`
            });
        }

        const dayStart = new Date(reservationDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(reservationDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingReservations = await Reservation.find({
            table,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ["Pending", "Confirmed"] }
        });

        const hasConflict = existingReservations.some((reservation) => {
            return (
                startMinutes < reservation.endTime.split(":").map(Number)[0] * 60 +
                    Number(reservation.endTime.split(":")[1]) &&
                endMinutes > reservation.startTime.split(":").map(Number)[0] * 60 +
                    Number(reservation.startTime.split(":")[1])
            );
        });

        if (hasConflict) {
            return res.status(409).json({
                success: false,
                message: "This table is already reserved for that time"
            });
        }

        const reservation = await Reservation.create({
            user: req.user._id,
            table,
            date: reservationDate,
            startTime,
            endTime,
            guests: guestCount,
            specialRequests
        });

        const populatedReservation = await Reservation.findById(reservation._id)
            .populate({ path: "user", select: "name email", model: User })
            .populate("table");

        return res.status(201).json({
            success: true,
            message: "Reservation created successfully",
            reservation: populatedReservation
        });
    } catch (error) {
        console.error("Create reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create reservation"
        });
    }
};

export const getUserReservations = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        const reservations = await Reservation.find({
            user: req.user._id
        })
            .populate({ path: "user", select: "name email", model: User })
            .populate("table")
            .sort({ date: -1, startTime: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            reservations
        });
    } catch (error) {
        console.error("Get user reservations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch your reservations"
        });
    }
};

export const getReservation = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        const reservation = await Reservation.findById(req.params.id)
            .populate({ path: "user", select: "name email", model: User })
            .populate("table");

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        return res.status(200).json({
            success: true,
            reservation
        });
    } catch (error) {
        console.error("Get reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservation"
        });
    }
};

export const getAllReservations = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        if (req.user.role !== "Manager") {
            return res.status(403).json({
                success: false,
                message: "Only managers can view all reservations"
            });
        }

        const reservations = await Reservation.find()
            .populate({ path: "user", select: "name email", model: User })
            .populate("table")
            .sort({ date: -1, startTime: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            reservations
        });
    } catch (error) {
        console.error("Get all reservations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservations"
        });
    }
};

export const updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Cancelled",
            "Completed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation status"
            });
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        if (status === "Pending" || status === "Confirmed") {
            const [hours, minutes] = reservation.startTime.split(":").map(Number);
            const startMinutes = hours * 60 + minutes;

            const [endHours, endMinutesPart] = reservation.endTime
                .split(":")
                .map(Number);
            const finishMinutes = endHours * 60 + endMinutesPart;

            const dayStart = new Date(reservation.date);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(reservation.date);
            dayEnd.setHours(23, 59, 59, 999);

            const otherReservations = await Reservation.find({
                _id: { $ne: reservation._id },
                table: reservation.table,
                date: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ["Pending", "Confirmed"] }
            });

            const hasConflict = otherReservations.some((other) => {
                const [otherStartHours, otherStartMinutes] =
                    other.startTime.split(":").map(Number);
                const otherStart =
                    otherStartHours * 60 + otherStartMinutes;

                const [otherEndHours, otherEndMinutes] =
                    other.endTime.split(":").map(Number);
                const otherEnd = otherEndHours * 60 + otherEndMinutes;

                return startMinutes < otherEnd && finishMinutes > otherStart;
            });

            if (hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: "This table already has a reservation at that time"
                });
            }
        }

        reservation.status = status;
        await reservation.save();

        const updatedReservation = await Reservation.findById(reservation._id)
            .populate({ path: "user", select: "name email", model: User })
            .populate("table");

        return res.status(200).json({
            success: true,
            message: "Reservation status updated successfully",
            reservation: updatedReservation
        });
    } catch (error) {
        console.error("Update reservation status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update reservation status"
        });
    }
};

export const deleteReservation = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated"
            });
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        const isOwner =
            reservation.user.toString() === req.user._id.toString();
        const isManager = req.user.role === "Manager";

        if (!isOwner && !isManager) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to delete this reservation"
            });
        }

        await Reservation.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Reservation deleted successfully"
        });
    } catch (error) {
        console.error("Delete reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete reservation"
        });
    }
};


export const checkTableAvailability = async (req, res) => {
    try {
        const { tableId, date, startTime, endTime, guests = 1 } = req.query;

        if (!date || !startTime) {
            return res.status(400).json({
                success: false,
                message: "Please provide date and start time"
            });
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid start time format. Use HH:mm"
            });
        }

        const reservationDate = new Date(date);

        if (Number.isNaN(reservationDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation date"
            });
        }

        const guestCount = Number(guests);

        if (!Number.isInteger(guestCount) || guestCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Guests must be a positive integer"
            });
        }

        const [startHours, startMinutesPart] = startTime
            .split(":")
            .map(Number);

        const requestedStart =
            startHours * 60 + startMinutesPart;

        let requestedEnd;

        if (endTime) {
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(endTime)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid end time format. Use HH:mm"
                });
            }

            const [endHours, endMinutesPart] = endTime
                .split(":")
                .map(Number);

            requestedEnd = endHours * 60 + endMinutesPart;
        } else {
            requestedEnd = requestedStart + 60;
        }

        if (
            requestedEnd <= requestedStart ||
            requestedEnd > 24 * 60
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation time range"
            });
        }

        const dayStart = new Date(reservationDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(reservationDate);
        dayEnd.setHours(23, 59, 59, 999);

        if (tableId) {
            const selectedTable = await Table.findById(tableId);

            if (!selectedTable) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found"
                });
            }

            const tableReservations = await Reservation.find({
                table: selectedTable._id,
                date: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ["Pending", "Confirmed"] }
            });

            const conflicts = tableReservations.filter((reservation) => {
                const [existingStartHours, existingStartMinutes] =
                    reservation.startTime.split(":").map(Number);

                const [existingEndHours, existingEndMinutes] =
                    reservation.endTime.split(":").map(Number);

                const existingStart =
                    existingStartHours * 60 + existingStartMinutes;

                const existingEnd =
                    existingEndHours * 60 + existingEndMinutes;

                return (
                    requestedStart < existingEnd &&
                    requestedEnd > existingStart
                );
            });

            let reason = null;

            if (selectedTable.isAvailable === false) {
                reason = "This table is not available";
            } else if (guestCount > selectedTable.seats) {
                reason = `This table can accommodate only ${selectedTable.seats} guests`;
            } else if (conflicts.length > 0) {
                reason = "This table is already reserved for that time";
            }

            const available = reason === null;

            return res.status(200).json({
                success: true,
                available,
                isAvailable: available,
                table: selectedTable,
                availableTables: available ? [selectedTable] : [],
                conflictingReservations: conflicts.map((reservation) => ({
                    startTime: reservation.startTime,
                    endTime: reservation.endTime,
                    status: reservation.status
                })),
                message: available
                    ? "Table is available for the selected time"
                    : reason
            });
        }

        const allTables = await Table.find();

        const reservations = await Reservation.find({
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ["Pending", "Confirmed"] }
        });

        const tableResults = allTables.map((table) => {
            const conflicts = reservations.filter((reservation) => {
                if (
                    String(reservation.table) !== String(table._id)
                ) {
                    return false;
                }

                const [existingStartHours, existingStartMinutes] =
                    reservation.startTime.split(":").map(Number);

                const [existingEndHours, existingEndMinutes] =
                    reservation.endTime.split(":").map(Number);

                const existingStart =
                    existingStartHours * 60 + existingStartMinutes;

                const existingEnd =
                    existingEndHours * 60 + existingEndMinutes;

                return (
                    requestedStart < existingEnd &&
                    requestedEnd > existingStart
                );
            });

            let reason = null;

            if (table.isAvailable === false) {
                reason = "Table is not available";
            } else if (guestCount > table.seats) {
                reason = `Table capacity is ${table.seats} guests`;
            } else if (conflicts.length > 0) {
                reason = "Already reserved for this time";
            }

            return {
                table,
                available: reason === null,
                reason
            };
        });

        const availableTables = tableResults
            .filter((item) => item.available)
            .map((item) => item.table);

        return res.status(200).json({
            success: true,
            date: date,
            startTime,
            endTime:
                endTime ||
                `${String(Math.floor(requestedEnd / 60)).padStart(2, "0")}:${String(requestedEnd % 60).padStart(2, "0")}`,
            guests: guestCount,
            totalTables: allTables.length,
            availableCount: availableTables.length,
            availableTables,
            tables: tableResults
        });
    } catch (error) {
        console.error("Check table availability error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to check table availability"
        });
    }
};
