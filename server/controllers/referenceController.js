const { Campus, Category, Department, Faculty, Hall } = require("../models");

async function listCampuses(_req, res, next) {
  try {
    const items = await Campus.findAll({
      attributes: ["id", "name", "location"],
      order: [["name", "ASC"]]
    });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listFaculties(req, res, next) {
  try {
    const where = {};
    if (req.query.campus_id) {
      where.campus_id = req.query.campus_id;
    }
    const items = await Faculty.findAll({
      where,
      attributes: ["id", "name", "campus_id"],
      order: [["name", "ASC"]]
    });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listDepartments(req, res, next) {
  try {
    const where = {};
    if (req.query.faculty_id) {
      where.faculty_id = req.query.faculty_id;
    }
    const items = await Department.findAll({
      where,
      attributes: ["id", "name", "faculty_id", "campus_id"],
      order: [["name", "ASC"]]
    });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listHalls(req, res, next) {
  try {
    const where = {};
    if (req.query.campus_id) {
      where.campus_id = req.query.campus_id;
    }
    const items = await Hall.findAll({
      where,
      attributes: ["id", "name", "hall_number", "campus_id"],
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
  listCampuses,
  listFaculties,
  listDepartments,
  listHalls,
  listCategories
};
