import express from "express";
import dotenv from "dotenv";

console.log("Starting server...");
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

app.use(express.json());

// Simple test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Test server running on port ${port}`);
});