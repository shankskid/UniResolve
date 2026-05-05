require("dotenv").config();
const express = require("express");
const { sequelize } = require("./models");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "uniresolve-server", environment: process.env.NODE_ENV || "development" });
});

app.get("/health/db", async (_req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`UniResolve server listening on port ${port}`);
});
