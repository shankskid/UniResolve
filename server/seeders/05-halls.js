"use strict";

const { halls } = require("./data/structure");

module.exports = {
  async up(queryInterface) {
    const ids = halls.map((hall) => hall.id);
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM halls WHERE id IN (:ids)",
      { replacements: { ids } }
    );
    const existingIds = new Set(rows.map((row) => row.id));
    const rowsToInsert = halls
      .filter((hall) => !existingIds.has(hall.id))
      .map((hall) => ({
        id: hall.id,
        name: hall.name,
        hall_number: hall.hallNumber,
        created_at: new Date(),
        updated_at: new Date()
      }));

    if (!rowsToInsert.length) {
      return;
    }

    await queryInterface.bulkInsert("halls", rowsToInsert, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("halls", null, {});
  }
};
