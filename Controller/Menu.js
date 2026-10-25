import Menu from "../Schema/Menu.js";
import { cloudinaryUpload, cloudinary } from "../utils/Upload.js";

export const createMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, isAvailable } = req.body;
        if (!name || !description || !price || !category) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image"
            });
        }

        const uploadImage = await cloudinaryUpload(req.file.buffer);
        const menuItem = await Menu.create({
            ...req.body,
            image: {
                public_id: uploadImage.public_id,
                url: uploadImage.secure_url
            }
        });
        return res.status(201).json({
            success: true,
            message: "Menu item created successfully",
            menuItem
        });
    } catch (error) {
        console.log("Create menu item error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating the menu item"
        });
    }
};

export const getAllMenuItems = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        const menuItems = await Menu.find(query);
        return res.status(200).json({
            success: true,
            count: menuItems.length,
            menuItems,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching menu items",
        });
    }
};

export const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await Menu.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }
        return res.status(200).json({
            success: true,
            menuItem,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

export const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const existingItem = await Menu.findById(id);

        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }

        // Build update object safely from req.body
        let updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.price !== undefined) updateData.price = Number(req.body.price);
        if (req.body.category !== undefined) updateData.category = req.body.category;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.isAvailable !== undefined) {
            updateData.isAvailable = req.body.isAvailable === "true" || req.body.isAvailable === true;
        }

        // Case 1: A new image file is uploaded via multer (memory storage buffer)
        if (req.file) {
            if (existingItem.image && existingItem.image.public_id) {
                try {
                    await cloudinary.uploader.destroy(existingItem.image.public_id);
                } catch (cloudinaryErr) {
                    console.error("Error deleting old image from Cloudinary:", cloudinaryErr);
                }
            }

            const uploadResult = await cloudinaryUpload(req.file.buffer);

            updateData.image = {
                url: uploadResult.secure_url || uploadResult.url,
                public_id: uploadResult.public_id,
            };
        } 
        // Case 2: Image was explicitly removed from the frontend edit screen
        else if (req.body?.removeImage === "true") {
            if (existingItem.image && existingItem.image.public_id) {
                try {
                    await cloudinary.uploader.destroy(existingItem.image.public_id);
                } catch (cloudinaryErr) {
                    console.error("Error deleting old image from Cloudinary:", cloudinaryErr);
                }
            }
            updateData.image = null;
        }

        const menuItem = await Menu.findByIdAndUpdate(id, updateData, { 
            new: true, 
            runValidators: true 
        });

        return res.status(200).json({
            success: true,
            message: "Menu item updated successfully",
            menuItem,
        });
    } catch (error) {
        console.log("Update menu error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong while updating menu item",
        });
    }
};

export const deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await Menu.findByIdAndDelete(req.params.id);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Menu item deleted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting menu item",
        });
    }
};