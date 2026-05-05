"use strict";

const { campuses } = require("./data/structure");

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "campuses",
      campuses.map((campus) => ({
        id: campus.id,
        name: campus.name,
        location: campus.location,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("campuses", null, {});
  }
};
