"use strict";

const bcrypt = require("bcrypt");
const { departments, fixedUuid, halls } = require("./data/structure");

const now = () => new Date();
const passwordHash = bcrypt.hashSync("Demo1234!", 12);
const firstDepartment = departments[0];
const secondDepartment = departments[1];
const firstHall = halls[0];

const demoUsers = [
  {
    id: fixedUuid("user-superadmin"),
    name: "System Superadmin",
    email: "superadmin@uniresolve.edu",
    role: "superadmin",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-1"),
    name: "Residential and Academic Overseer",
    email: "overseer1@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-2"),
    name: "Facilities Overseer",
    email: "overseer2@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-3"),
    name: "Student Welfare Overseer",
    email: "overseer3@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-4"),
    name: "Academic Affairs Overseer",
    email: "overseer4@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-5"),
    name: "Residential Life Overseer",
    email: "overseer5@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-6"),
    name: "Campus Services Overseer",
    email: "overseer6@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-7"),
    name: "Health and Safety Overseer",
    email: "overseer7@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-8"),
    name: "Community Engagement Overseer",
    email: "overseer8@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-9"),
    name: "Operations Overseer",
    email: "overseer9@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-overseer-10"),
    name: "Student Support Overseer",
    email: "overseer10@uniresolve.edu",
    role: "overseer",
    user_type: null,
    department_id: null,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-officer-hall-1"),
    name: "Hall Officer One",
    email: "officer.hall1@uniresolve.edu",
    role: "officer",
    user_type: null,
    department_id: firstDepartment.id,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-officer-hall-2"),
    name: "Hall Officer Two",
    email: "officer.hall2@uniresolve.edu",
    role: "officer",
    user_type: null,
    department_id: firstDepartment.id,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-officer-dept-1"),
    name: "Department Officer One",
    email: "officer.department1@uniresolve.edu",
    role: "officer",
    user_type: null,
    department_id: firstDepartment.id,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-officer-dept-2"),
    name: "Department Officer Two",
    email: "officer.department2@uniresolve.edu",
    role: "officer",
    user_type: null,
    department_id: secondDepartment.id,
    hall_id: null,
    registration_number: null
  },
  {
    id: fixedUuid("user-student-hall"),
    name: "Demo Residential Student",
    email: "student.hall@uniresolve.edu",
    role: "student",
    user_type: "student",
    department_id: firstDepartment.id,
    hall_id: firstHall.id,
    registration_number: "SCS/DEMO/001"
  },
  {
    id: fixedUuid("user-student-nohall"),
    name: "Demo Non-Residential Student",
    email: "student.nohall@uniresolve.edu",
    role: "student",
    user_type: "student",
    department_id: secondDepartment.id,
    hall_id: null,
    registration_number: "SCS/DEMO/002"
  },
  {
    id: fixedUuid("user-staff"),
    name: "Demo Staff Member",
    email: "staff@uniresolve.edu",
    role: "staff",
    user_type: "staff",
    department_id: firstDepartment.id,
    hall_id: null,
    registration_number: null
  }
];

module.exports = {
  async up(queryInterface) {
    const emails = demoUsers.map((user) => user.email);
    const [rows] = await queryInterface.sequelize.query(
      "SELECT email FROM users WHERE email IN (:emails)",
      { replacements: { emails } }
    );
    const existingEmails = new Set(rows.map((row) => row.email));
    const usersToInsert = demoUsers
      .filter((user) => !existingEmails.has(user.email))
      .map((user) => ({
        ...user,
        password_hash: passwordHash,
        is_active: true,
        created_at: now(),
        updated_at: now()
      }));

    if (!usersToInsert.length) {
      return;
    }

    await queryInterface.bulkInsert("users", usersToInsert, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", {
      email: demoUsers.map((user) => user.email)
    }, {});
  }
};
