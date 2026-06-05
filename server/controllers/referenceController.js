const { Category, Department, Hall } = require("../models");

async function listDepartments(req, res, next) {
  try {
    const items = await Department.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]]
    });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listHalls(req, res, next) {
  try {
    const items = await Hall.findAll({
      attributes: ["id", "name", "hall_number"],
      order: [["hall_number", "ASC"]]
    });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listCategories(_req, res, next) {
  try {
    const items = await Category.findAll({
      attributes: ["id", "name", "jurisdiction_type", "min_urgency"],
      order: [["name", "ASC"]]
    });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listDepartments,
  listHalls,
  listCategories
};
