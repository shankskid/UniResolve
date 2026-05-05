"use strict";

const { campuses, departments, faculties } = require("./data/structure");

const campusByCode = new Map(campuses.map((campus) => [campus.code, campus]));
const facultyById = new Map(faculties.map((faculty) => [faculty.id, faculty]));

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "departments",
      departments.map((department) => {
        const faculty = facultyById.get(department.facultyId);
        return {
          id: department.id,
          name: department.name,
          faculty_id: faculty.id,
          campus_id: campusByCode.get(faculty.campusCode).id,
          created_at: new Date(),
          updated_at: new Date()
        };
      }),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("departments", null, {});
  }
};
