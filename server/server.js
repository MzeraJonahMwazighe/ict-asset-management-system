
require("dotenv").config();                          //}
                                                     //}
const express = require("express");                   //}   loads the envirometn variables,Express
const path = require("path");                          //}     ,Nodes.js path uttilities and our database connection 
const pool = require("./db");                           //}     pool from the db.js file.

const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming request data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "..", "public")));

// Test route
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            status: "success",
            message: "ICT Asset Management System is running.",
            database: rows[0].database_name
        });
    } catch (error) {
        console.error("Health check failed:", error);

        res.status(500).json({
            status: "error",
            message: "Database connection failed."
        });
    }
});

 // Dashboard statistics route
app.get("/api/dashboard", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                COUNT(*) AS total_assets,
                COALESCE(SUM(asset_status = 'Active'), 0) AS active_assets,
                COALESCE(SUM(asset_status = 'Under Maintenance'), 0) AS maintenance_assets,
                COALESCE(SUM(asset_status = 'Damaged Beyond Repair'), 0) AS damaged_assets
            FROM assets
        `);

        res.json(rows[0]);
    } catch (error) {
        console.error("Dashboard query failed:", error.message);

        res.status(500).json({
            message: "Unable to load dashboard statistics."
        });
    }
});

 // Get all registered assets
app.get("/api/assets", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                asset_id,
                asset_type,
                computer_name,
                device_model,
                device_description,
                operating_system,
                username,
                department,
                serial_number,
                employee_id,
                assignment_type,
                asset_status
            FROM assets
            ORDER BY asset_id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Failed to fetch assets:", error.message);

        res.status(500).json({
            message: "Unable to retrieve assets."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
