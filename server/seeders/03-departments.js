"use strict";

const { departments } = require("./data/structure");

module.exports = {
  async up(queryInterface) {
    const ids = departments.map((department) => department.id);
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM departments WHERE id IN (:ids)",
      { replacements: { ids } }
    );
    const existingIds = new Set(rows.map((row) => row.id));
    const rowsToInsert = departments
      .filter((department) => !existingIds.has(department.id))
      .map((department) => ({
        id: department.id,
        name: department.name,
        created_at: new Date(),
        updated_at: new Date()
      }));

    if (!rowsToInsert.length) {
      return;
    }

    await queryInterface.bulkInsert("departments", rowsToInsert, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("departments", null, {});
  }
};
