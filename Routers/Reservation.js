import express from "express";
import {
    createReservation,
    getUserReservations,
    getAllReservations,
    updateReservationStatus,
    deleteReservation,
    getReservation,
    checkTableAvailability
} from "../Controller/Reservation.js";
import { isAuthenticated, isManager } from "../utils/Auth.js";

const reservationRouter = express.Router();

reservationRouter.get("/table/availability", checkTableAvailability);

reservationRouter.post("/new/reservation", isAuthenticated, createReservation);
reservationRouter.get("/my/reservations", isAuthenticated, getUserReservations);
reservationRouter.get("/reservation/:id", isAuthenticated, getReservation);
reservationRouter.delete("/delete/reservation/:id", isAuthenticated, deleteReservation);
reservationRouter.get( "/reservations", isAuthenticated, isManager("Manager"), getAllReservations );
reservationRouter.put( "/reservation/status/:id", isAuthenticated, isManager("Manager"), updateReservationStatus );

export default reservationRouter;


{/*
    http://localhost:3000/api/v1/reservations
    http://localhost:3000/api/v1/reservation/:id
    http://localhost:3000/api/v1/new/reservation
    http://localhost:3000/api/v1/my/reservations
    http://localhost:3000/api/v1/delete/reservation/:id
    http://localhost:3000/api/v1/reservation/status/:id
    http://localhost:3000/api/v1/table/availability
    
*/}