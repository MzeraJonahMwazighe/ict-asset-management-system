const employeeTableBody = document.getElementById("employee-table-body");
const employeeSearch = document.getElementById("employee-search");
const departmentFilter = document.getElementById("employee-department-filter");
const employeeMessage = document.getElementById("employee-message");

let employees = [];

// Load employee records from the server
async function loadEmployees() {
    try {
        const response = await fetch("/api/employees");

        if (!response.ok) {
            throw new Error("Failed to load employee records.");
        }

        employees = await response.json();

        displayEmployees();

    } catch (error) {
        console.error("Error loading employees:", error);

        employeeTableBody.innerHTML = `
            <tr>
                <td colspan="6">Unable to load employee records.</td>
            </tr>
        `;
    }
}

// Display employee records
function displayEmployees() {
    const searchTerm = employeeSearch.value.toLowerCase().trim();
    const selectedDepartment = departmentFilter.value;

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.name.toLowerCase().includes(searchTerm) ||
            employee.department.toLowerCase().includes(searchTerm);

        const matchesDepartment =
            selectedDepartment === "" ||
            employee.department === selectedDepartment;

        return matchesSearch && matchesDepartment;
    });

    employeeTableBody.innerHTML = "";

    if (filteredEmployees.length === 0) {
        employeeTableBody.innerHTML = `
            <tr>
                <td colspan="6">No matching employees found.</td>
            </tr>
        `;
        employeeMessage.textContent = "";
        return;
    }

    // Group rows by employee ID so employees with multiple devices appear once.
    const employeeGroups = new Map();

    filteredEmployees.forEach(employee => {
        if (!employeeGroups.has(employee.employee_id)) {
            employeeGroups.set(employee.employee_id, {
                name: employee.name,
                department: employee.department,
                assets: []
            });
        }

        if (employee.asset_id !== null) {
            employeeGroups.get(employee.employee_id).assets.push(employee);
        }
    });

    employeeGroups.forEach(employee => {
        if (employee.assets.length === 0) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(employee.name)}</td>
                <td>${escapeHTML(employee.department)}</td>
                <td>Unassigned</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
            `;

            employeeTableBody.appendChild(row);
            return;
        }

        employee.assets.forEach(asset => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(employee.name)}</td>
                <td>${escapeHTML(employee.department)}</td>
                <td>${escapeHTML(asset.computer_name || asset.asset_type || "Unnamed device")}</td>
                <td>${escapeHTML(asset.device_model || "—")}</td>
                <td>${escapeHTML(asset.serial_number || "—")}</td>
                <td>${formatAssignmentDuration(asset.assigned_date)}</td>
            `;

            employeeTableBody.appendChild(row);
        });
    });

    employeeMessage.textContent =
        `Showing ${employeeGroups.size} of ${employees.filter(employee =>
            employee.asset_id === null ||
            employee.asset_id !== null
        ).length} employees.`;
}

// Calculate how long an asset has been assigned
function formatAssignmentDuration(assignedDate) {
    if (!assignedDate) {
        return "Not recorded";
    }

    const startDate = new Date(assignedDate);
    const today = new Date();

    if (Number.isNaN(startDate.getTime()) || startDate > today) {
        return "Not recorded";
    }

    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();

    if (today.getDate() < startDate.getDate()) {
        months--;
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years > 0) {
        return `${years} year(s), ${months} month(s)`;
    }

    if (months > 0) {
        return `${months} month(s)`;
    }

    const days = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    return `${days} day(s)`;
}

// Escape database text before placing it into the HTML table
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// Search and department filtering
employeeSearch.addEventListener("input", displayEmployees);
departmentFilter.addEventListener("change", displayEmployees);

// Load employees when the page opens
loadEmployees();
