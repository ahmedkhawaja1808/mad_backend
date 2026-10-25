import Table from "../Schema/Table.js";

export const getAllTables = async (req, res) => {
    try {
        const tables = await Table.find();
        return res.status(200).json({
            success: true,
            count: tables.length,
            tables,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching tables",
        });
    }
};

export const getTableById = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }
        return res.status(200).json({
            success: true,
            table,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

export const createTable = async (req, res) => {
    try {
        const { tableNumber, seats, isAvailable } = req.body;
        if (!tableNumber || !seats) {
            return res.status(400).json({
                success: false,
                message: "Please provide table number and number of seats",
            });
        }
        const table = await Table.create({
            tableNumber,
            seats,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
        });
        return res.status(201).json({
            success: true,
            message: "Table created successfully",
            table,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating table",
        });
    }
};

export const updateTable = async (req, res) => {
    try {
        const table = await Table.findByIdAndUpdate( req.params.id, req.body, { new: true, runValidators: true } );
        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Table updated successfully",
            table,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating table",
        });
    }
};

export const deleteTable = async (req, res) => {
    try {
        const table = await Table.findByIdAndDelete(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Table deleted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting table",
        });
    }
};