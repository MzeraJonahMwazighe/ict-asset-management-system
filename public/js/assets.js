

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