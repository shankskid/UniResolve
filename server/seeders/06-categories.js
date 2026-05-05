"use strict";

const { categories } = require("./data/structure");

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "categories",
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        jurisdiction_type: category.jurisdiction_type,
        min_urgency: category.min_urgency,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("categories", null, {});
  }
};
