import express from "express"
import connect from "./db.js";
import dotenv from 'dotenv'
import userRouter from "./Routers/User.js";
import menuRouter from "./Routers/Menu.js";
import tableRouter from "./Routers/Table.js";
import reservationRouter from "./Routers/Reservation.js";
import orderRouter from "./Routers/Order.js";
import cookieParser from "cookie-parser";
import cors from "cors"
dotenv.config()
const app = express()
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json())
app.use(cookieParser())
const port = process.env.PORT
app.use("/api/v1", userRouter)
app.use("/api/v1", menuRouter)
app.use("/api/v1", tableRouter)
app.use("/api/v1", reservationRouter)
app.use("/api/v1", orderRouter)
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port: ${port}`);
})
connect()