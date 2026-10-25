import express from "express";
import { getAllMenuItems, getMenuItemById, createMenuItem, updateMenuItem, deleteMenuItem } from "../Controller/Menu.js";
import { isAuthenticated, isManager } from "../utils/Auth.js";
import { upload } from "../utils/Upload.js";

const menuRouter = express.Router();

menuRouter.get("/menu", getAllMenuItems)
menuRouter.get("/menu/:id", getMenuItemById);
menuRouter.post("/new/menu", isAuthenticated, isManager("Manager"), upload.single("image"), createMenuItem);
menuRouter.put("/update/menu/:id", isAuthenticated, isManager("Manager"),upload.single("image"), updateMenuItem);
menuRouter.delete("/delete/menu/:id", isAuthenticated, isManager("Manager"), deleteMenuItem);

export default menuRouter;

{/*
    http://localhost:3000/api/v1/menu
    http://localhost:3000/api/v1/menu/:id
    http://localhost:3000/api/v1/new/menu
    http://localhost:3000/api/v1/update/menu/:id
    http://localhost:3000/api/v1/delete/menu/:id
    
*/}