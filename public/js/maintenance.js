
const maintenanceForm = document.getElementById("maintenance-form");
const assetSelect = document.getElementById("maintenance-asset");
const maintenanceMessage = document.getElementById("maintenance-message");
const maintenanceTableBody = document.getElementById("maintenance-table-body");

const problemInput = document.getElementById("problem-description");
const actionInput = document.getElementById("action-taken");
const dateInput = document.getElementById("maintenance-date");

// Set today's date as the default.
dateInput.value = new Date().toLocaleDateString("en-CA");

// Load assets into the dropdown.
async function loadAssets() {
    try {
        const response = await fetch("/api/maintenance/assets");

        if (!response.ok) {
            throw new Error("Failed to load assets.");
        }

        const assets = await response.json();

        assetSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select an asset";
        assetSelect.appendChild(defaultOption);

        assets.forEach(asset => {
            const option = document.createElement("option");
            option.value = asset.asset_id;

            option.textContent =
                `ID ${asset.asset_id} - ${asset.asset_type} - ` +
                `${asset.computer_name} - ${asset.serial_number}`;

            assetSelect.appendChild(option);
        });

    } catch (error) {
        assetSelect.innerHTML = '<option value="">Unable to load assets</option>';
        console.error(error);
    }
}

// Format a MySQL date without changing its calendar day.
function formatDate(dateValue) {
    if (!dateValue) return "-";

    const datePart = String(dateValue).split("T")[0];
    const [year, month, day] = datePart.split("-");

    return `${day}/${month}/${year}`;
}


// Load maintenance history.
async function loadMaintenance() {
    try {
        const response = await fetch("/api/maintenance");

        if (!response.ok) {
            throw new Error("Failed to load maintenance records.");
        }

        const records = await response.json();

        maintenanceTableBody.replaceChildren();

        if (records.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 8;
            cell.textContent = "No maintenance records found.";

            row.appendChild(cell);
            maintenanceTableBody.appendChild(row);
            return;
        }

        records.forEach(record => {
            const row = document.createElement("tr");

            const values = [
                record.computer_name || record.asset_type,
                record.device_model || "-",
                record.serial_number || "-",
                record.problem_description,
                record.action_taken || "-",
                formatDate(record.maintenance_date),
                record.outcome
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            if (record.outcome === "Pending") {
                const updateButton = document.createElement("button");

                updateButton.type = "button";
                updateButton.textContent = "Update";

                updateButton.addEventListener("click", () => {
                    const existingRow = row.nextElementSibling;

                    if (
                        existingRow &&
                        existingRow.dataset.completionFor ===
                            String(record.maintenance_id)
                    ) {
                        existingRow.remove();
                        return;
                    }

                    const completionRow = document.createElement("tr");
                    completionRow.dataset.completionFor =
                        String(record.maintenance_id);

                    const completionCell = document.createElement("td");
                    completionCell.colSpan = 8;

                    const completionForm = document.createElement("form");
                    completionForm.className = "maintenance-form-group";

                    const actionLabel = document.createElement("label");
                    actionLabel.textContent = "Final Action Taken";

                    const finalAction = document.createElement("textarea");
                    finalAction.required = true;
                    finalAction.placeholder =
                        "Describe the final maintenance work...";

                    const outcomeLabel = document.createElement("label");
                    outcomeLabel.textContent = "Maintenance Outcome";

                    const outcomeSelect = document.createElement("select");
                    outcomeSelect.required = true;

                    const defaultOption = document.createElement("option");
                    defaultOption.value = "";
                    defaultOption.textContent = "Select outcome";
                    outcomeSelect.appendChild(defaultOption);

                    ["Fixed", "Damaged Beyond Repair"].forEach(outcome => {
                        const option = document.createElement("option");
                        option.value = outcome;
                        option.textContent = outcome;
                        outcomeSelect.appendChild(option);
                    });

                    const saveButton = document.createElement("button");
                    saveButton.type = "submit";
                    saveButton.textContent = "Complete Maintenance";

                    const cancelButton = document.createElement("button");
                    cancelButton.type = "button";
                    cancelButton.textContent = "Cancel";

                    cancelButton.addEventListener("click", () => {
                        completionRow.remove();
                    });

                    completionForm.append(
                        actionLabel,
                        finalAction,
                        outcomeLabel,
                        outcomeSelect,
                        saveButton,
                        cancelButton
                    );

                    completionForm.addEventListener(
                        "submit",
                        async event => {
                            event.preventDefault();

                            saveButton.disabled = true;
                            saveButton.textContent = "Saving...";

                            try {
                                const updateResponse = await fetch(
                                    `/api/maintenance/${record.maintenance_id}`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "Content-Type": "application/json"
                                        },
                                        body: JSON.stringify({
                                            action_taken: finalAction.value.trim(),
                                            outcome: outcomeSelect.value
                                        })
                                    }
                                );

                                const result = await updateResponse.json();

                                if (!updateResponse.ok) {
                                    throw new Error(
                                        result.message ||
                                        "Unable to complete maintenance."
                                    );
                                }

                                maintenanceMessage.textContent =
                                    result.message;

                                await loadMaintenance();
                                await loadAssets();

                            } catch (error) {
                                maintenanceMessage.textContent =
                                    error.message;

                                saveButton.disabled = false;
                                saveButton.textContent =
                                    "Complete Maintenance";
                            }
                        }
                    );

                    completionCell.appendChild(completionForm);
                    completionRow.appendChild(completionCell);

                    row.after(completionRow);
                });

                actionCell.appendChild(updateButton);
            } else {
                actionCell.textContent = "-";
            }

            row.appendChild(actionCell);
            maintenanceTableBody.appendChild(row);
        });

    } catch (error) {
        console.error(error);
        maintenanceTableBody.textContent =
            "Unable to load maintenance records.";
    }
}


// Save a maintenance record.
maintenanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    maintenanceMessage.textContent = "Saving maintenance record...";

    const record = {
    asset_id: Number(assetSelect.value),
    problem_description: problemInput.value.trim(),
    action_taken: actionInput.value.trim(),
    maintenance_date: dateInput.value
};

    try {
        const response = await fetch("/api/maintenance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(record)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save record.");
        }

        maintenanceMessage.textContent = result.message;

        maintenanceForm.reset();
        dateInput.value = new Date().toLocaleDateString("en-CA");

        await loadAssets();
        await loadMaintenance();

    } catch (error) {
        maintenanceMessage.textContent = error.message;
    }
});

// Initial page loading.
loadAssets();
loadMaintenance();
