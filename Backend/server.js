const express = require("express");
const cors = require("cors");
const router = require("./router/routes");

const app = express();

const PORT = process.env.PORT || 5002;
app.use(express.json());
app.use(cors());

app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
