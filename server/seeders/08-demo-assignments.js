"use strict";

const { departments, fixedUuid, halls } = require("./data/structure");

const hallOfficers = [
  fixedUuid("user-officer-hall-1"),
  fixedUuid("user-officer-hall-2")
];
const deptOfficers = [
  fixedUuid("user-officer-dept-1"),
  fixedUuid("user-officer-dept-2")
];
const overseers = [
  fixedUuid("user-overseer-1"),
  fixedUuid("user-overseer-2"),
  fixedUuid("user-overseer-3"),
  fixedUuid("user-overseer-4"),
  fixedUuid("user-overseer-5"),
  fixedUuid("user-overseer-6"),
  fixedUuid("user-overseer-7"),
  fixedUuid("user-overseer-8"),
  fixedUuid("user-overseer-9"),
  fixedUuid("user-overseer-10")
];
const allOfficers = [...hallOfficers, ...deptOfficers];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const officerAssignments = [
      ...halls.slice(0, 4).map((hall, index) => ({
        id: fixedUuid(`assignment-hall-${hall.id}`),
        officer_id: hallOfficers[index % hallOfficers.length],
        scope_type: "hall",
        scope_id: hall.id,
        created_at: now,
        updated_at: now
      })),
      ...departments.slice(0, 4).map((department, index) => ({
        id: fixedUuid(`assignment-department-${department.id}`),
        officer_id: deptOfficers[index % deptOfficers.length],
        scope_type: "department",
        scope_id: department.id,
        created_at: now,
        updated_at: now
      }))
    ];

    const overseerAssignments = allOfficers.map((officerId, index) => ({
      id: fixedUuid(`overseer-assignment-${officerId}`),
      overseer_id: overseers[index % overseers.length],
      officer_id: officerId,
      created_at: now,
      updated_at: now
    }));

    const officerAssignmentIds = officerAssignments.map((assignment) => assignment.id);
    const overseerAssignmentIds = overseerAssignments.map((assignment) => assignment.id);
    const [existingOfficerRows] = await queryInterface.sequelize.query(
      "SELECT id FROM officer_assignments WHERE id IN (:ids)",
      { replacements: { ids: officerAssignmentIds } }
    );
    const [existingOverseerRows] = await queryInterface.sequelize.query(
      "SELECT id FROM overseer_assignments WHERE id IN (:ids)",
      { replacements: { ids: overseerAssignmentIds } }
    );

    const existingOfficerIds = new Set(existingOfficerRows.map((row) => row.id));
    const existingOverseerIds = new Set(existingOverseerRows.map((row) => row.id));
    const officerAssignmentsToInsert = officerAssignments.filter(
      (assignment) => !existingOfficerIds.has(assignment.id)
    );
    const overseerAssignmentsToInsert = overseerAssignments.filter(
      (assignment) => !existingOverseerIds.has(assignment.id)
    );

    if (officerAssignmentsToInsert.length) {
      await queryInterface.bulkInsert("officer_assignments", officerAssignmentsToInsert, {});
    }
    if (overseerAssignmentsToInsert.length) {
      await queryInterface.bulkInsert("overseer_assignments", overseerAssignmentsToInsert, {});
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("overseer_assignments", null, {});
    await queryInterface.bulkDelete("officer_assignments", null, {});
  }
};
