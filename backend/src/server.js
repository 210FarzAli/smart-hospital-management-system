require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const departmentRoutes = require("./routes/departments");
const doctorRoutes = require("./routes/doctors");
const appointmentRoutes = require("./routes/appointments");
const prescriptionRoutes = require("./routes/prescriptions");
const reviewRoutes = require("./routes/reviews");
const pharmacyRoutes = require("./routes/pharmacy");
const assistantRoutes = require("./routes/assistant");
const reportRoutes = require("./routes/reports");
const laboratoryRoutes = require("./routes/laboratory");
const hrRoutes = require("./routes/hr");
const receptionRoutes = require("./routes/reception");
const adminRoutes = require("./routes/admin");
const { ensureMigrations } = require("./db/migrations");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/laboratory", laboratoryRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/reception", receptionRoutes);
app.use("/api/admin", adminRoutes);

// Fallback error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Smart Hospital backend running on http://localhost:${PORT}`);
  await ensureMigrations();
});
