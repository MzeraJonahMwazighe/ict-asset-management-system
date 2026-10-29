

let allAssets = [];

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

loadAssets();

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
        document.getElementById("edit_department").value = asset.department ?? "";
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
