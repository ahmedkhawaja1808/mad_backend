import express from "express";
import { createOrder, getUserOrders, getAllOrders, updateOrderStatus, getOrderById } from "../Controller/Order.js";
import { isAuthenticated, isManager } from "../utils/Auth.js";

const orderRouter = express.Router();
orderRouter.post("/order", isAuthenticated, createOrder);
orderRouter.get("/my/orders", isAuthenticated, getUserOrders);
orderRouter.get("/all/orders", isAuthenticated, isManager("Manager"), getAllOrders);
orderRouter.get("/order/:id", isAuthenticated, getOrderById)
orderRouter.put("/order/status/:id", isAuthenticated, isManager("Manager"), updateOrderStatus);

export default orderRouter;

{/*
    http://localhost:3000/api/v1/order
    http://localhost:3000/api/v1/my/orders
    http://localhost:3000/api/v1/order/:id
    http://localhost:3000/api/v1/all/orders
    http://localhost:3000/api/v1/order/status/:id
    
 */}