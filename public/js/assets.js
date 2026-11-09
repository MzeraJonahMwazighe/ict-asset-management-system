

let allAssets = [];
let allEmployees = [];

const departments = [
    "Sales",
    "Accounting",
    "Operations",
    "Quality Assurance",
    "ICT",
    "Engineering",
    "Mechanics"
];

async function loadAssets() {
    const tableBody = document.getElementById("asset-table-body");

    try {
        const response = await fetch("/api/assets");

        if (!response.ok) {
            throw new Error("Failed to load assets from the server.");
        }

        allAssets = await response.json();

        renderAssets();

    } catch (error) {
        console.error("Asset loading error:", error.message);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">Unable to load assets. Please try again.</td>
            </tr>
        `;
    }
}

async function loadEmployees() {
    try {
        const response = await fetch("/api/employees");

        if (!response.ok) {
            throw new Error("Failed to load employees.");
        }

        const employeeRecords = await response.json();

        // Keep one record per employee.
        const uniqueEmployees = new Map();

        employeeRecords.forEach(employee => {
            uniqueEmployees.set(employee.employee_id, {
                employee_id: employee.employee_id,
                name: employee.name,
                department: employee.department
            });
        });

        allEmployees = Array.from(uniqueEmployees.values());

    } catch (error) {
        console.error("Employee loading error:", error.message);
    }
}

function setupAssignmentDropdowns() {
    const assignmentType = document.getElementById("assignment_type");
    const departmentSelect = document.getElementById("department");
    const employeeSelect = document.getElementById("employee_id");

    function updateAssignmentFields() {
        const selectedType = assignmentType.value;

        // Reset department and employee selections.
        departmentSelect.value = "";
        employeeSelect.innerHTML =
            '<option value="">Select employee</option>';

        // Unassigned assets need neither department nor employee.
        if (selectedType === "Unassigned") {
            departmentSelect.disabled = true;
            employeeSelect.disabled = true;
            return;
        }

        // Individual and Department assignments need a department.
        departmentSelect.disabled = selectedType === "";

        // Employee selection is only needed for Individual assignments.
        employeeSelect.disabled = selectedType !== "Individual";
    }

    function updateEmployeeOptions() {
        const selectedDepartment = departmentSelect.value;

        employeeSelect.innerHTML =
            '<option value="">Select employee</option>';

        const departmentEmployees = allEmployees.filter(employee =>
            employee.department === selectedDepartment
        );

        departmentEmployees.forEach(employee => {
            const option = document.createElement("option");
            option.value = employee.employee_id;
            option.textContent = employee.name;

            employeeSelect.appendChild(option);
        });

        employeeSelect.disabled =
            assignmentType.value !== "Individual" ||
            selectedDepartment === "";
    }

    assignmentType.addEventListener("change", updateAssignmentFields);

    departmentSelect.addEventListener("change", updateEmployeeOptions);

    updateAssignmentFields();
}

function setupEditAssignmentDropdowns() {
    const assignmentType = document.getElementById("edit_assignment_type");
    const departmentSelect = document.getElementById("edit_department");
    const employeeSelect = document.getElementById("edit_employee_id");

    function updateAssignmentFields(resetSelections = true) {
        const selectedType = assignmentType.value;

        if (resetSelections) {
            departmentSelect.value = "";
            employeeSelect.innerHTML =
                '<option value="">Select employee</option>';
        }

        if (selectedType === "Unassigned") {
            departmentSelect.disabled = true;
            employeeSelect.disabled = true;
            return;
        }

        departmentSelect.disabled = selectedType === "";
        employeeSelect.disabled = selectedType !== "Individual";
    }

    function updateEmployeeOptions() {
        const selectedDepartment = departmentSelect.value;

        employeeSelect.innerHTML =
            '<option value="">Select employee</option>';

        const departmentEmployees = allEmployees.filter(employee =>
            employee.department === selectedDepartment
        );

        departmentEmployees.forEach(employee => {
            const option = document.createElement("option");
            option.value = employee.employee_id;
            option.textContent = employee.name;

            employeeSelect.appendChild(option);
        });

        employeeSelect.disabled =
            assignmentType.value !== "Individual" ||
            selectedDepartment === "";
    }

    // Make these functions available to the edit-button handler.
    window.updateEditAssignmentFields = updateAssignmentFields;
    window.updateEditEmployeeOptions = updateEmployeeOptions;

    assignmentType.addEventListener("change", () => {
        updateAssignmentFields(true);
    });

    departmentSelect.addEventListener("change", updateEmployeeOptions);

    updateAssignmentFields();
}

function renderAssets() {
    const tableBody = document.getElementById("asset-table-body");

    const searchInput = document.getElementById("asset-search");
    const typeFilter = document.getElementById("asset-type-filter");
    const statusFilter = document.getElementById("asset-status-filter");

    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedType = typeFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredAssets = allAssets.filter(asset => {
        const searchableText = [
            asset.computer_name,
            asset.device_model,
            asset.serial_number,
            asset.department
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);
        const matchesType =
            !selectedType || asset.asset_type === selectedType;
        const matchesStatus =
            !selectedStatus || asset.asset_status === selectedStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    if (filteredAssets.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">No matching assets found.</td>
            </tr>
        `;
        return;
    }

tableBody.innerHTML = filteredAssets.map(asset => `
    <tr>
        <td>${asset.computer_name ?? ""}</td>
        <td>${asset.asset_type ?? ""}</td>
        <td>${asset.device_model ?? ""}</td>
        <td>${asset.serial_number ?? ""}</td>
        <td>${asset.department ?? ""}</td>
        <td>${asset.asset_status ?? ""}</td>
        <td>
            <button
                type="button"
                class="button edit-asset-button"
                data-asset-id="${asset.asset_id}"
            >
                Edit
            </button>
        </td>
    </tr>
`).join("");
}

document.getElementById("asset-search").addEventListener(
    "input",
    renderAssets
);

document.getElementById("asset-type-filter").addEventListener(
    "change",
    renderAssets
);

document.getElementById("asset-status-filter").addEventListener(
    "change",
    renderAssets
);

async function initializeAssetPage() {
    await loadEmployees();
    setupAssignmentDropdowns();
    await loadAssets();
}

initializeAssetPage();

const showAssetFormButton = document.getElementById("show-asset-form");
const assetFormContainer = document.getElementById("asset-form-container");
const cancelAssetFormButton = document.getElementById("cancel-asset-form");

showAssetFormButton.addEventListener("click", () => {
    assetFormContainer.hidden = false;
});

cancelAssetFormButton.addEventListener("click", () => {
    assetFormContainer.hidden = true;
});


const assetForm = document.getElementById("asset-form");
const assetFormMessage = document.getElementById("asset-form-message");

assetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = assetForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    assetFormMessage.textContent = "Saving asset...";

    try {
        const formData = new FormData(assetForm);
        const assetData = Object.fromEntries(formData.entries());
        // Validate assignment information
       if (!assetData.assignment_type) {
       throw new Error("Please select an assignment type.");
       }

      if (
       assetData.assignment_type === "Individual" &&
      (!assetData.department || !assetData.employee_id)
       ) {
      throw new Error("Please select a department and employee.");
     }

      if (
      assetData.assignment_type === "Department" &&
       !assetData.department
       ) {
     throw new Error("Please select a department.");
      }

    // Remove irrelevant assignment fields.
    if (assetData.assignment_type === "Unassigned") {
    assetData.department = "";
    assetData.employee_id = "";
   }

    if (assetData.assignment_type === "Department") {
    assetData.employee_id = "";
    }

        const response = await fetch("/api/assets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(assetData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to register asset."
            );
        }

        assetFormMessage.textContent = result.message;

        assetForm.reset();

        await loadAssets();

        // Hide the registration form after successful registration
        document.getElementById("asset-form-container").hidden = true;

    } catch (error) {
        assetFormMessage.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

const editAssetFormContainer = document.getElementById(
    "edit-asset-form-container"
);

const editAssetForm = document.getElementById("edit-asset-form");
const editAssetMessage = document.getElementById("edit-asset-message");
const cancelEditAssetButton = document.getElementById("cancel-edit-asset");
setupEditAssignmentDropdowns();

// Open the edit form and fill it with the selected asset's details
document.getElementById("asset-table-body").addEventListener(
    "click",
    event => {
        const editButton = event.target.closest(".edit-asset-button");

        if (!editButton) {
            return;
        }

        const assetId = Number(editButton.dataset.assetId);

        const asset = allAssets.find(
            item => Number(item.asset_id) === assetId
        );

        if (!asset) {
            return;
        }

        document.getElementById("edit_asset_id").value = asset.asset_id;
        document.getElementById("edit_asset_type").value = asset.asset_type ?? "Computer";
        document.getElementById("edit_computer_name").value = asset.computer_name ?? "";
        document.getElementById("edit_device_model").value = asset.device_model ?? "";
        document.getElementById("edit_device_description").value = asset.device_description ?? "";
        document.getElementById("edit_operating_system").value = asset.operating_system ?? "";
        document.getElementById("edit_username").value = asset.username ?? "";
        const editAssignmentType = document.getElementById("edit_assignment_type");
const editDepartment = document.getElementById("edit_department");
const editEmployee = document.getElementById("edit_employee_id");

// Load the saved assignment type.
editAssignmentType.value = asset.assignment_type ?? "Unassigned";

// Update which fields are enabled without clearing selections.
window.updateEditAssignmentFields(false);

// Only select a department if it matches our official department list.
editDepartment.value = departments.includes(asset.department)
    ? asset.department
    : "";

// Load employees belonging to that department.
window.updateEditEmployeeOptions();

// Restore the assigned employee, if one exists.
editEmployee.value = asset.employee_id ?? "";
        document.getElementById("edit_serial_number").value = asset.serial_number ?? "";
        document.getElementById("edit_asset_status").value = asset.asset_status ?? "Active";

        editAssetMessage.textContent = "";
        editAssetFormContainer.hidden = false;
        editAssetFormContainer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
);

// Cancel editing
cancelEditAssetButton.addEventListener("click", () => {
    editAssetFormContainer.hidden = true;
    editAssetForm.reset();
    editAssetMessage.textContent = "";
});


editAssetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const assetId = document.getElementById("edit_asset_id").value;
    const submitButton = editAssetForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    editAssetMessage.textContent = "Saving changes...";

    try {
        const formData = new FormData(editAssetForm);
        const assetData = Object.fromEntries(formData.entries());

// Validate assignment details.
if (!assetData.assignment_type) {
    throw new Error("Please select an assignment type.");
}

if (
    assetData.assignment_type === "Individual" &&
    (!assetData.department || !assetData.employee_id)
) {
    throw new Error("Please select a department and employee.");
}

if (
    assetData.assignment_type === "Department" &&
    !assetData.department
) {
    throw new Error("Please select a department.");
}

// Clear fields that do not apply to the selected assignment type.
if (assetData.assignment_type === "Department") {
    assetData.employee_id = "";
}

if (assetData.assignment_type === "Unassigned") {
    assetData.department = "";
    assetData.employee_id = "";
}

delete assetData.asset_id;

        const response = await fetch(`/api/assets/${assetId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(assetData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to update asset."
            );
        }

        editAssetMessage.textContent = result.message;

        await loadAssets();

        // Close the edit form after a successful update
        editAssetFormContainer.hidden = true;
        editAssetForm.reset();

    } catch (error) {
        console.error("Asset update error:", error.message);
        editAssetMessage.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});
