"use strict";

const { campuses, hallZones } = require("./data/structure");

const campusByCode = new Map(campuses.map((campus) => [campus.code, campus]));

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "hall_zones",
      hallZones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        campus_id: campusByCode.get(zone.campusCode).id,
        grievance_officer_id: null,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("hall_zones", null, {});
  }
};
