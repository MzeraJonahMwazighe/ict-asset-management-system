//fetch("/api/dashboard") requests the latest statistics from your backend.
async function loadDashboardStats() {
    try {
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
            throw new Error("Failed to fetch dashboard statistics."); //fetch("/api/dashboard") requests the latest statistics from your backend.
        }

        const stats = await response.json();//response.json() reads the data returned by your API.

        //getElementById(...) finds each dashboard card using the IDs
        document.getElementById("total-assets").textContent =
            stats.total_assets;

        document.getElementById("active-assets").textContent =
            stats.active_assets;

        document.getElementById("maintenance-assets").textContent =
            stats.maintenance_assets;

        document.getElementById("damaged-assets").textContent =
            stats.damaged_assets;

    } catch (error) {
        console.error("Dashboard loading error:", error.message);
    }
}

loadDashboardStats();
