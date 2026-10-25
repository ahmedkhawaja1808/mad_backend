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
  let stage = "Starting availability check";

  try {
    const {
      tableId,
      date,
      startTime,
      endTime,
      guests = 1,
    } = req.query;

    console.log("[AVAILABILITY] Request:", {
      tableId,
      date,
      startTime,
      endTime,
      guests,
    });

    // ----------------------------------
    // 1. VALIDATE REQUEST
    // ----------------------------------

    stage = "Validating request";

    if (!date || !startTime) {
      return res.status(400).json({
        success: false,
        message: "Date and start time are required",
      });
    }

    const timePattern =
      /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timePattern.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid start time. Use HH:mm",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must use YYYY-MM-DD format",
      });
    }

    const reservationDate = new Date(
      `${date}T00:00:00.000Z`
    );

    if (
      Number.isNaN(reservationDate.getTime()) ||
      reservationDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation date",
      });
    }

    const guestCount = Number(guests);

    if (
      !Number.isInteger(guestCount) ||
      guestCount < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Guests must be a positive integer",
      });
    }

    // ----------------------------------
    // 2. CALCULATE BOOKING TIME
    // ----------------------------------

    const [hours, minutes] = startTime
      .split(":")
      .map(Number);

    const requestedStart = hours * 60 + minutes;

    // Enforce the schema's one-hour duration.
    const requestedEnd = requestedStart + 60;

    if (requestedEnd > 1440) {
      return res.status(400).json({
        success: false,
        message: "Reservation cannot extend beyond midnight",
      });
    }

    const calculatedEndTime = [
      String(Math.floor(requestedEnd / 60)).padStart(
        2,
        "0"
      ),
      String(requestedEnd % 60).padStart(2, "0"),
    ].join(":");

    if (
      endTime !== undefined &&
      endTime !== calculatedEndTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Reservation must last exactly one hour",
      });
    }

    // ----------------------------------
    // 3. DATE RANGE
    // ----------------------------------

    // The create controller receives YYYY-MM-DD,
    // which is stored as midnight UTC.
    // Use a half-open UTC range consistently.

    const dayStart = new Date(reservationDate);

    const dayEnd = new Date(
      dayStart.getTime() + 24 * 60 * 60 * 1000
    );

    console.log("[AVAILABILITY] Date range:", {
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
    });

    // ----------------------------------
    // 4. LOAD TABLES
    // ----------------------------------

    stage = "Loading tables";

    let allTables;

    if (tableId) {
      if (
        !/^[a-fA-F0-9]{24}$/.test(String(tableId))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid table ID",
        });
      }

      const selectedTable = await Table.findById(
        tableId
      ).lean();

      if (!selectedTable) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      allTables = [selectedTable];
    } else {
      allTables = await Table.find().lean();
    }

    console.log(
      "[AVAILABILITY] Tables found:",
      allTables.length
    );

    // ----------------------------------
    // 5. LOAD EXISTING RESERVATIONS
    // ----------------------------------

    stage = "Loading reservations";

    const reservationQuery = {
      date: {
        $gte: dayStart,
        $lt: dayEnd,
      },
      status: {
        $in: ["Pending", "Confirmed"],
      },
    };

    if (tableId) {
      reservationQuery.table = tableId;
    }

    console.log(
      "[AVAILABILITY] Querying reservations"
    );

    const reservations = await Reservation.find(
      reservationQuery
    ).lean();

    console.log(
      "[AVAILABILITY] Reservations found:",
      reservations.length
    );

    // Zero reservations is completely valid.
    // In that case, no table has a booking conflict.

    // ----------------------------------
    // 6. CHECK TIME CONFLICTS
    // ----------------------------------

    stage = "Calculating availability";

    const toMinutes = (time) => {
      if (
        typeof time !== "string" ||
        !timePattern.test(time)
      ) {
        return null;
      }

      const [h, m] = time.split(":").map(Number);

      return h * 60 + m;
    };

    const tableResults = allTables.map((table) => {
      const tableIdString = String(table._id);

      let hasConflict = false;
      const conflictingReservations = [];

      for (const reservation of reservations) {
        if (
          String(reservation.table) !== tableIdString
        ) {
          continue;
        }

        const existingStart = toMinutes(
          reservation.startTime
        );

        const existingEnd = toMinutes(
          reservation.endTime
        );

        if (
          existingStart === null ||
          existingEnd === null
        ) {
          console.warn(
            "[AVAILABILITY] Invalid reservation time:",
            String(reservation._id)
          );

          // Fail closed for malformed bookings:
          // don't accidentally offer an occupied table.
          hasConflict = true;
          continue;
        }

        const overlaps =
          requestedStart < existingEnd &&
          requestedEnd > existingStart;

        if (overlaps) {
          hasConflict = true;

          conflictingReservations.push({
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            status: reservation.status,
          });
        }
      }

      let reason = null;

      if (table.isAvailable === false) {
        reason = "Table is not available";
      } else if (
        !Number.isFinite(Number(table.seats)) ||
        Number(table.seats) < 1
      ) {
        reason = "Table capacity is not configured";
      } else if (guestCount > Number(table.seats)) {
        reason = `Table capacity is ${table.seats} guests`;
      } else if (hasConflict) {
        reason = "Already reserved for this time";
      }

      return {
        table,
        available: reason === null,
        reason,
        conflictingReservations,
      };
    });

    // ----------------------------------
    // 7. GET AVAILABLE TABLES
    // ----------------------------------

    const availableTables = tableResults
      .filter((item) => item.available)
      .map((item) => item.table);

    console.log("[AVAILABILITY] Result:", {
      totalTables: allTables.length,
      availableCount: availableTables.length,
    });

    // ----------------------------------
    // 8. SINGLE TABLE RESPONSE
    // ----------------------------------

    if (tableId) {
      const result = tableResults[0];

      return res.status(200).json({
        success: true,
        available: result.available,
        isAvailable: result.available,
        table: result.table,
        availableTables,
        conflictingReservations:
          result.conflictingReservations,
        message: result.available
          ? "Table is available for the selected time"
          : result.reason,
      });
    }

    // ----------------------------------
    // 9. ALL TABLES RESPONSE
    // ----------------------------------

    return res.status(200).json({
      success: true,
      date,
      startTime,
      endTime: calculatedEndTime,
      guests: guestCount,
      totalTables: allTables.length,
      availableCount: availableTables.length,
      availableTables,
      tables: tableResults,
    });
  } catch (error) {
    // Logs will identify exactly which
    // operation failed on Vercel.

    console.error(
      "[AVAILABILITY] FAILED AT:",
      stage
    );

    console.error(
      "[AVAILABILITY] Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to check table availability",
      stage,
    });
  }
};