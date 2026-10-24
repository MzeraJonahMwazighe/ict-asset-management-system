
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

        console.log("Dashboard data from MySQL:", rows[0]);
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

/**
 * Register a new asset
 */
app.post("/api/assets", async (req, res) => {
    try {
        const {
            asset_type,
            computer_name,
            device_model,
            device_description,
            operating_system,
            username,
            department,
            serial_number,
            asset_status
        } = req.body;

        // Validate required fields
        if (
            !asset_type ||
            !device_model ||
            !department ||
            !serial_number ||
            !asset_status
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        // Determine how the asset is assigned
        const assignment_type = username
            ? "Individual"
            : department
                ? "Department"
                : "Unassigned";

        const [result] = await pool.query(
            `INSERT INTO assets (
                asset_type,
                computer_name,
                device_model,
                device_description,
                operating_system,
                username,
                department,
                serial_number,
                assignment_type,
                asset_status,
                employee_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
            [
                asset_type,
                computer_name || null,
                device_model,
                device_description || null,
                operating_system || null,
                username || null,
                department,
                serial_number,
                assignment_type,
                asset_status
            ]
        );

        res.status(201).json({
            message: "Asset registered successfully.",
            asset_id: result.insertId
        });
    } catch (error) {
        console.error("Asset registration failed:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "An asset with this serial number already exists."
            });
        }

        if (error.code === "ER_DATA_TOO_LONG" || error.code === "WARN_DATA_TRUNCATED") {
            return res.status(400).json({
                message: "One or more asset fields contain invalid values."
            });
        }

        res.status(500).json({
            message: "Unable to register asset."
        });
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
