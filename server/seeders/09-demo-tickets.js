"use strict";

const { categories, departments, fixedUuid, halls } = require("./data/structure");

const now = new Date();
const hallCategory = categories.find((category) => category.jurisdiction_type === "hall");
const departmentCategory = categories.find((category) => category.jurisdiction_type === "department");

const tickets = [
  {
    id: fixedUuid("ticket-demo-hall"),
    title: "No water in Hall 1",
    description: "There has been no running water in Hall 1 since morning.",
    status: "open",
    urgency: "high",
    category_id: hallCategory.id,
    submitter_id: fixedUuid("user-student-hall"),
    assigned_to: fixedUuid("user-officer-hall-1"),
    scope_type: "hall",
    scope_id: halls[0].id
  },
  {
    id: fixedUuid("ticket-demo-classroom-lighting"),
    title: "No lights in classroom",
    description: "The classroom lights in our department building are not working.",
    status: "in_progress",
    urgency: "medium",
    category_id: departmentCategory.id,
    submitter_id: fixedUuid("user-student-nohall"),
    assigned_to: fixedUuid("user-officer-dept-2"),
    scope_type: "department",
    scope_id: departments[1].id
  },
  {
    id: fixedUuid("ticket-demo-staff-office"),
    title: "Broken office door lock",
    description: "The office door lock in the department block needs repair.",
    status: "open",
    urgency: "low",
    category_id: departmentCategory.id,
    submitter_id: fixedUuid("user-staff"),
    assigned_to: fixedUuid("user-officer-dept-1"),
    scope_type: "department",
    scope_id: departments[0].id
  }
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "tickets",
      tickets.map((ticket) => ({
        ...ticket,
        jurisdiction_type: ticket.scope_type,
        is_anonymous: false,
        sla_deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        sla_breached: false,
        resolved_at: null,
        closed_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now
      })),
      {}
    );

    await queryInterface.bulkInsert(
      "ticket_history",
      tickets.flatMap((ticket) => [
        {
          id: fixedUuid(`history-${ticket.id}-created`),
          ticket_id: ticket.id,
          changed_by: "SYSTEM",
          field_changed: "created",
          old_value: null,
          new_value: ticket.id,
          created_at: now
        },
        {
          id: fixedUuid(`history-${ticket.id}-assigned`),
          ticket_id: ticket.id,
          changed_by: "SYSTEM",
          field_changed: "assigned_to",
          old_value: null,
          new_value: ticket.assigned_to,
          created_at: now
        }
      ]),
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("ticket_history", {
      ticket_id: tickets.map((ticket) => ticket.id)
    }, {});
    await queryInterface.bulkDelete("tickets", {
      id: tickets.map((ticket) => ticket.id)
    }, {});
  }
};
