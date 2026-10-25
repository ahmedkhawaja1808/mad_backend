import express from "express";
import { getAllTables, getTableById, createTable, updateTable, deleteTable } from "../Controller/Table.js";
import { isAuthenticated, isManager } from "../utils/Auth.js";

const tableRouter = express.Router();
tableRouter.get("/tables", getAllTables);
tableRouter.get("/table/:id", getTableById);
tableRouter.post("/insert/table", isAuthenticated, isManager("Manager"), createTable);
tableRouter.put("/update/table/:id", isAuthenticated, isManager("Manager"), updateTable);
tableRouter.delete("/delete/table/:id", isAuthenticated, isManager("Manager"), deleteTable);

export default tableRouter;

{/*
    http://localhost:3000/api/v1/tables
    http://localhost:3000/api/v1/table/:id
    http://localhost:3000/api/v1/insert/table
    http://localhost:3000/api/v1/update/table/:id
    http://localhost:3000/api/v1/delete/table/:id
    
*/}