
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

// Get all employees and their assigned assets
app.get("/api/employees", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                e.employee_id,
                e.name,
                e.department,
                a.asset_id,
                a.asset_type,
                a.computer_name,
                a.device_model,
                a.serial_number,
                a.assigned_date
            FROM employees e
            LEFT JOIN assets a
                ON e.employee_id = a.employee_id
            ORDER BY e.name ASC, a.asset_id ASC
        `);

        res.json(rows);

    } catch (error) {
        console.error("Failed to fetch employees:", error.message);

        res.status(500).json({
            message: "Unable to retrieve employee records."
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
            assignment_type,
            employee_id,
            department,
            serial_number,
            asset_status
        } = req.body;

        // Validate required asset fields
        if (
            !asset_type ||
            !device_model ||
            !serial_number ||
            !asset_status ||
            !assignment_type
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        const allowedAssetTypes = [
            "Computer",
            "Server",
            "Printer",
            "Cisco Phone"
        ];

        const allowedAssetStatuses = [
            "Active",
            "Under Maintenance",
            "Damaged Beyond Repair"
        ];

        const allowedAssignmentTypes = [
            "Individual",
            "Department",
            "Unassigned"
        ];

        const allowedDepartments = [
            "Sales",
            "Accounting",
            "Operations",
            "Quality Assurance",
            "ICT",
            "Engineering",
            "Mechanics"
        ];

        if (!allowedAssetTypes.includes(asset_type)) {
            return res.status(400).json({
                message: "Invalid device type."
            });
        }

        if (!allowedAssetStatuses.includes(asset_status)) {
            return res.status(400).json({
                message: "Invalid asset status."
            });
        }

        if (!allowedAssignmentTypes.includes(assignment_type)) {
            return res.status(400).json({
                message: "Invalid assignment type."
            });
        }

        let finalDepartment = "Unassigned";
        let finalEmployeeId = null;

        // Handle individual assignment
        if (assignment_type === "Individual") {
            const employeeId = Number(employee_id);

            if (!Number.isInteger(employeeId) || employeeId <= 0) {
                return res.status(400).json({
                    message: "Please select an employee."
                });
            }

            const [employees] = await pool.query(
                `SELECT employee_id, department
                 FROM employees
                 WHERE employee_id = ?`,
                [employeeId]
            );

            if (employees.length === 0) {
                return res.status(400).json({
                    message: "Selected employee does not exist."
                });
            }

            if (department !== employees[0].department) {
                return res.status(400).json({
                    message: "Employee does not belong to the selected department."
                });
            }

            finalEmployeeId = employeeId;
            finalDepartment = employees[0].department;
        }

        // Handle department assignment
        if (assignment_type === "Department") {
            if (!allowedDepartments.includes(department)) {
                return res.status(400).json({
                    message: "Please select a valid department."
                });
            }

            finalDepartment = department;
        }

        // Register the asset
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
                employee_id,
                assigned_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                CASE WHEN ? = 'Individual'
                THEN CURRENT_DATE ELSE NULL END)`,
            [
                asset_type,
                computer_name || null,
                device_model,
                device_description || null,
                operating_system || null,
                username || null,
                finalDepartment,
                serial_number,
                assignment_type,
                asset_status,
                finalEmployeeId,
                assignment_type
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

        if (
            error.code === "ER_DATA_TOO_LONG" ||
            error.code === "WARN_DATA_TRUNCATED"
        ) {
            return res.status(400).json({
                message: "One or more asset fields contain invalid values."
            });
        }

        res.status(500).json({
            message: "Unable to register asset."
        });
    }
});

/**
 * Update an existing asset
 */
app.put("/api/assets/:id", async (req, res) => {
    try {
        const assetId = Number(req.params.id);

        if (!Number.isInteger(assetId) || assetId <= 0) {
            return res.status(400).json({
                message: "Invalid asset ID."
            });
        }

        const {
            asset_type,
            computer_name,
            device_model,
            device_description,
            operating_system,
            username,
            assignment_type,
            employee_id,
            department,
            serial_number,
            asset_status
        } = req.body;

        // Validate required asset fields.
        if (
            !asset_type ||
            !device_model ||
            !serial_number ||
            !asset_status ||
            !assignment_type
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        // Validate allowed device types.
        const allowedAssetTypes = [
            "Computer",
            "Server",
            "Printer",
            "Cisco Phone"
        ];

        if (!allowedAssetTypes.includes(asset_type)) {
            return res.status(400).json({
                message: "Invalid device type."
            });
        }

        // Validate allowed asset statuses.
        const allowedAssetStatuses = [
            "Active",
            "Under Maintenance",
            "Damaged Beyond Repair"
        ];

        if (!allowedAssetStatuses.includes(asset_status)) {
            return res.status(400).json({
                message: "Invalid asset status."
            });
        }

        // Validate assignment type.
        const allowedAssignmentTypes = [
            "Individual",
            "Department",
            "Unassigned"
        ];

        if (!allowedAssignmentTypes.includes(assignment_type)) {
            return res.status(400).json({
                message: "Invalid assignment type."
            });
        }

        // Allowed departments.
        const allowedDepartments = [
            "Sales",
            "Accounting",
            "Operations",
            "Quality Assurance",
            "ICT",
            "Engineering",
            "Mechanics"
        ];

        // Check that the asset exists and retrieve its current assignment.
        const [existingAssets] = await pool.query(
            `SELECT employee_id, assigned_date
             FROM assets
             WHERE asset_id = ?`,
            [assetId]
        );

        if (existingAssets.length === 0) {
            return res.status(404).json({
                message: "Asset not found."
            });
        }

        const existingAsset = existingAssets[0];

        let finalDepartment = "Unassigned";
        let finalEmployeeId = null;
        let assignedDate = null;

        // Validate individual assignment.
        if (assignment_type === "Individual") {
            const selectedEmployeeId = Number(employee_id);

            if (
                !employee_id ||
                !Number.isInteger(selectedEmployeeId) ||
                selectedEmployeeId <= 0
            ) {
                return res.status(400).json({
                    message: "Please select a valid employee."
                });
            }

            if (!allowedDepartments.includes(department)) {
                return res.status(400).json({
                    message: "Please select a valid department."
                });
            }

            const [employees] = await pool.query(
                `SELECT employee_id, department
                 FROM employees
                 WHERE employee_id = ?`,
                [selectedEmployeeId]
            );

            if (employees.length === 0) {
                return res.status(400).json({
                    message: "Selected employee does not exist."
                });
            }

            if (employees[0].department !== department) {
                return res.status(400).json({
                    message: "Employee does not belong to the selected department."
                });
            }

            finalEmployeeId = selectedEmployeeId;
            finalDepartment = employees[0].department;

            // Preserve the date if the same employee remains assigned.
            if (
                Number(existingAsset.employee_id) === finalEmployeeId &&
                existingAsset.assigned_date
            ) {
                assignedDate = existingAsset.assigned_date;
            }
        }

        // Validate department assignment.
        else if (assignment_type === "Department") {
            if (!allowedDepartments.includes(department)) {
                return res.status(400).json({
                    message: "Please select a valid department."
                });
            }

            finalDepartment = department;
        }

        // Unassigned assets have no employee or department assignment.
        else {
            finalDepartment = "Unassigned";
        }

        // Update the asset.
        const [result] = await pool.query(
            `UPDATE assets
             SET
                asset_type = ?,
                computer_name = ?,
                device_model = ?,
                device_description = ?,
                operating_system = ?,
                username = ?,
                department = ?,
                serial_number = ?,
                employee_id = ?,
                assigned_date = CASE
                WHEN ? = 'Individual' THEN COALESCE(?, CURRENT_DATE)
                ELSE NULL
                END,
                assignment_type = ?,
                asset_status = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE asset_id = ?`,
            [
                asset_type,
                computer_name || null,
                device_model,
                device_description || null,
                operating_system || null,
                username || null,
                finalDepartment,
                serial_number,
                finalEmployeeId,
                assignment_type,
                assignedDate,
                assignment_type,
                asset_status,
                assetId
            ]
        );

        res.json({
            message: "Asset updated successfully."
        });

    } catch (error) {
        console.error("Asset update failed:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Another asset already uses this serial number."
            });
        }

        if (
            error.code === "ER_DATA_TOO_LONG" ||
            error.code === "WARN_DATA_TRUNCATED"
        ) {
            return res.status(400).json({
                message: "One or more asset fields contain invalid values."
            });
        }

        res.status(500).json({
            message: "Unable to update asset."
        });
    }
});

// Start server

/**
 * Fetch maintenance records
 */
app.get("/api/maintenance", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                m.maintenance_id,
                m.asset_id,
                m.problem_description,
                m.action_taken,
                m.maintenance_date,
                m.outcome,
                m.created_at,
                a.asset_type,
                a.computer_name,
                a.device_model,
                a.serial_number,
                a.department
            FROM maintenance m
            INNER JOIN assets a ON m.asset_id = a.asset_id
            ORDER BY m.maintenance_date DESC, m.maintenance_id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Failed to fetch maintenance records:", error.message);

        res.status(500).json({
            message: "Unable to retrieve maintenance records."
        });
    }
});

/**
 * Fetch assets for the maintenance dropdown
 */
app.get("/api/maintenance/assets", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                asset_id,
                asset_type,
                computer_name,
                device_model,
                serial_number,
                department,
                asset_status
            FROM assets
            ORDER BY asset_id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Failed to fetch maintenance assets:", error.message);

        res.status(500).json({
            message: "Unable to retrieve assets."
        });
    }
});

/**
 * Record new maintenance - always starts as Pending
 */
app.post("/api/maintenance", async (req, res) => {
    let connection;

    try {
        const {
            asset_id,
            problem_description,
            action_taken,
            maintenance_date
        } = req.body;

        const assetId = Number(asset_id);

        if (!Number.isInteger(assetId) || assetId <= 0) {
            return res.status(400).json({
                message: "Please select a valid asset."
            });
        }

        if (
            typeof problem_description !== "string" ||
            !problem_description.trim()
        ) {
            return res.status(400).json({
                message: "Please enter the problem description."
            });
        }

        if (
            typeof maintenance_date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(maintenance_date) ||
            !Number.isFinite(Date.parse(maintenance_date))
        ) {
            return res.status(400).json({
                message: "Please enter a valid maintenance date."
            });
        }

        const description = problem_description.trim();

        const action = typeof action_taken === "string"
            ? action_taken.trim()
            : "";

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [assets] = await connection.query(
            `SELECT asset_id, asset_status
             FROM assets
             WHERE asset_id = ?
             FOR UPDATE`,
            [assetId]
        );

        if (assets.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Selected asset does not exist."
            });
        }

        if (assets[0].asset_status === "Under Maintenance") {
            await connection.rollback();

            return res.status(409).json({
                message: "This asset is already under maintenance."
            });
        }

        if (assets[0].asset_status === "Damaged Beyond Repair") {
            await connection.rollback();

            return res.status(409).json({
                message: "This asset is marked as damaged beyond repair."
            });
        }

        await connection.query(
            `INSERT INTO maintenance (
                asset_id,
                problem_description,
                action_taken,
                maintenance_date,
                outcome,
                recorded_by
            ) VALUES (?, ?, ?, ?, 'Pending', NULL)`,
            [
                assetId,
                description,
                action || null,
                maintenance_date
            ]
        );

        await connection.query(
            `UPDATE assets
             SET asset_status = 'Under Maintenance'
             WHERE asset_id = ?`,
            [assetId]
        );

        await connection.commit();

        res.status(201).json({
            message: "Maintenance record saved successfully.",
            asset_status: "Under Maintenance"
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Failed to record maintenance:", error.message);

        res.status(500).json({
            message: "Unable to save maintenance record."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


/**
 * Complete an existing pending maintenance record
 */
app.put("/api/maintenance/:id", async (req, res) => {
    let connection;

    try {
        const maintenanceId = Number(req.params.id);
        const { action_taken, outcome } = req.body;

        if (!Number.isInteger(maintenanceId) || maintenanceId <= 0) {
            return res.status(400).json({
                message: "Invalid maintenance record."
            });
        }

        if (
            typeof action_taken !== "string" ||
            !action_taken.trim()
        ) {
            return res.status(400).json({
                message: "Please describe the final action taken."
            });
        }

        if (!["Fixed", "Damaged Beyond Repair"].includes(outcome)) {
            return res.status(400).json({
                message: "Please select a valid completion outcome."
            });
        }

        const newAssetStatus = outcome === "Fixed"
            ? "Active"
            : "Damaged Beyond Repair";

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [records] = await connection.query(
            `SELECT maintenance_id, asset_id, outcome
             FROM maintenance
             WHERE maintenance_id = ?
             FOR UPDATE`,
            [maintenanceId]
        );

        if (records.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Maintenance record not found."
            });
        }

        if (records[0].outcome !== "Pending") {
            await connection.rollback();

            return res.status(409).json({
                message: "Only pending maintenance records can be completed."
            });
        }

        const assetId = records[0].asset_id;

        const [assets] = await connection.query(
            `SELECT asset_id, asset_status
             FROM assets
             WHERE asset_id = ?
             FOR UPDATE`,
            [assetId]
        );

        if (
            assets.length === 0 ||
            assets[0].asset_status !== "Under Maintenance"
        ) {
            await connection.rollback();

            return res.status(409).json({
                message: "The asset is not currently under maintenance."
            });
        }

        await connection.query(
            `UPDATE maintenance
             SET action_taken = ?, outcome = ?
             WHERE maintenance_id = ?`,
            [
                action_taken.trim(),
                outcome,
                maintenanceId
            ]
        );

        await connection.query(
            `UPDATE assets
             SET asset_status = ?
             WHERE asset_id = ?`,
            [newAssetStatus, assetId]
        );

        await connection.commit();

        res.json({
            message: "Maintenance completed successfully.",
            asset_status: newAssetStatus
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Failed to complete maintenance:", error.message);

        res.status(500).json({
            message: "Unable to complete maintenance."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
