
const pool = require("./db");

async function testDatabase() {
    try {
        const [tables] = await pool.query("SHOW TABLES");

        console.log("Tables found in the database:");

        tables.forEach((table) => {
            console.log(Object.values(table)[0]);
        });
    } catch (error) {
        console.error("Database test failed:", error.message);
    } finally {
        await pool.end();
    }
}

testDatabase();
