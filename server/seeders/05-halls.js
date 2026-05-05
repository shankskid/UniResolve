"use strict";

const { campuses, halls, hallZones } = require("./data/structure");

const campusByCode = new Map(campuses.map((campus) => [campus.code, campus]));
const hallZoneByCampusAndKey = new Map();

for (const zone of hallZones) {
  const key = zone.name.endsWith("Zone A") ? `${zone.campusCode}-a` : `${zone.campusCode}-b`;
  hallZoneByCampusAndKey.set(key, zone);
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "halls",
      halls.map((hall) => ({
        id: hall.id,
        name: hall.name,
        hall_number: hall.hallNumber,
        campus_id: campusByCode.get(hall.campusCode).id,
        hall_zone_id: hallZoneByCampusAndKey.get(`${hall.campusCode}-${hall.hallZoneKey}`).id,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("halls", null, {});
  }
};
