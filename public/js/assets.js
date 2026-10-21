
async function loadAssets() {
    const tableBody = document.getElementById("asset-table-body");

    try {
        const response = await fetch("/api/assets");

        if (!response.ok) {
            throw new Error("Failed to load assets from the server.");
        }

        const assets = await response.json();

        if (assets.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">No assets registered yet.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = assets.map(asset => `
            <tr>
                <td>${asset.computer_name ?? ""}</td>
                <td>${asset.asset_type ?? ""}</td>
                <td>${asset.device_model ?? ""}</td>
                <td>${asset.serial_number ?? ""}</td>
                <td>${asset.department ?? ""}</td>
                <td>${asset.asset_status ?? ""}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Asset loading error:", error.message);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">Unable to load assets. Please try again.</td>
            </tr>
        `;
    }
}

loadAssets();
