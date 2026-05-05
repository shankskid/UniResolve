const fs = require("fs");
const path = require("path");
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const db = {};
const basename = path.basename(__filename);

for (const file of fs.readdirSync(__dirname)) {
  if (file === basename || !file.endsWith(".js")) {
    continue;
  }
  const modelFactory = require(path.join(__dirname, file));
  const model = modelFactory(sequelize, DataTypes);
  db[model.name] = model;
}

for (const modelName of Object.keys(db)) {
  if (typeof db[modelName].associate === "function") {
    db[modelName].associate(db);
  }
}

db.sequelize = sequelize;

module.exports = db;
