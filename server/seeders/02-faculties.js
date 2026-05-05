"use strict";

const { campuses, faculties } = require("./data/structure");

const campusByCode = new Map(campuses.map((campus) => [campus.code, campus]));

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "faculties",
      faculties.map((faculty) => ({
        id: faculty.id,
        name: faculty.name,
        campus_id: campusByCode.get(faculty.campusCode).id,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("faculties", null, {});
  }
};
