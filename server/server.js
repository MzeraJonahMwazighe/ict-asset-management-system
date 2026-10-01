const express = require("express");

const app = express();

const PORT = 3000;

app.get("/", (reg, res) => {
    res.send("Ict Asset Managment System is running.");
});

app.listen(PORT, () => {
    console.log('Server is running at http://localhost:${PORT}');
});