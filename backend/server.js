// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,       // your local frontend (http://localhost:5173)
      "http://localhost:5173",      // ensure local dev always works
      "https://connect-fronted.onrender.com/", // deployed frontend (replace with actual Render frontend URL)
    ].filter(Boolean), // removes any undefined
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const conversationRoutes = require("./routes/conversation.routes");
const messageRoutes = require("./routes/message.routes");
const userRoutes = require("./routes/user.routes");

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/", (req, res) => res.send("✅ Backend is running"));

// Protected ping test
const auth = require("./middleware/auth");
app.get("/api/ping", auth, (req, res) =>
  res.json({ ok: true, userId: req.user.id })
);

// Port
const PORT = process.env.PORT || 4000;

// Connect DB and start server
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });