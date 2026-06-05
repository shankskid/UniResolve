"use strict";

const { JURISDICTION_VALUES, ROLE_VALUES, TICKET_STATUS_VALUES, URGENCY_VALUES } = require("@uniresolve/shared");

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const uuidDefault = Sequelize.literal("gen_random_uuid()");

    await queryInterface.createTable("campuses", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(100), allowNull: false },
      location: { type: DataTypes.STRING(200), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("faculties", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(100), allowNull: false },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campuses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("departments", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(100), allowNull: false },
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "faculties", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campuses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("hall_zones", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(100), allowNull: false },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campuses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      grievance_officer_id: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("halls", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(100), allowNull: false },
      hall_number: { type: DataTypes.INTEGER, allowNull: false },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campuses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      hall_zone_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "hall_zones", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("users", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(200), allowNull: false },
      email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      role: { type: DataTypes.ENUM(...ROLE_VALUES), allowNull: false },
      user_type: { type: DataTypes.ENUM("student", "staff"), allowNull: true },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "departments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      hall_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "halls", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campuses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.addConstraint("hall_zones", {
      fields: ["grievance_officer_id"],
      type: "foreign key",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      name: "hall_zones_grievance_officer_id_fkey"
    });

    await queryInterface.createTable("officer_scopes", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      scope_type: { type: DataTypes.ENUM("hall_zone", "department", "faculty", "campus", "university"), allowNull: false },
      scope_id: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("categories", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      name: { type: DataTypes.STRING(100), allowNull: false },
      jurisdiction_type: { type: DataTypes.ENUM(...JURISDICTION_VALUES), allowNull: false },
      min_urgency: { type: DataTypes.ENUM(...URGENCY_VALUES), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("tickets", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      title: { type: DataTypes.STRING(300), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM(...TICKET_STATUS_VALUES), allowNull: false, defaultValue: "open" },
      urgency: { type: DataTypes.ENUM(...URGENCY_VALUES), allowNull: false },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      submitter_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      assigned_to: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campuses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      jurisdiction_type: { type: DataTypes.ENUM(...JURISDICTION_VALUES), allowNull: false },
      is_anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sla_deadline: { type: DataTypes.DATE, allowNull: true },
      sla_breached: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("ticket_comments", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      author_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      is_internal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("ticket_attachments", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      uploader_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      file_url: { type: DataTypes.TEXT, allowNull: false },
      file_name: { type: DataTypes.STRING(255), allowNull: false },
      file_size: { type: DataTypes.BIGINT, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("ticket_history", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      changed_by: { type: DataTypes.STRING(100), allowNull: false },
      field_changed: { type: DataTypes.STRING(100), allowNull: false },
      old_value: { type: DataTypes.TEXT, allowNull: true },
      new_value: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("ticket_escalations", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      escalated_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      escalated_to_role: { type: DataTypes.STRING(100), allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("notifications", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      type: { type: DataTypes.STRING(100), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("satisfaction_surveys", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      submitter_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      resolved_satisfactorily: { type: DataTypes.BOOLEAN, allowNull: false },
      response_time_score: { type: DataTypes.INTEGER, allowNull: false },
      comments: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("canned_responses", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      title: { type: DataTypes.STRING(200), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("knowledge_base", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      title: { type: DataTypes.STRING(200), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      source_ticket_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("resolution_checklists", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      step_order: { type: DataTypes.INTEGER, allowNull: false },
      step_text: { type: DataTypes.STRING(300), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("ticket_checklist_items", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      checklist_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "resolution_checklists", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      is_completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      completed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ticket_checklist_items");
    await queryInterface.dropTable("resolution_checklists");
    await queryInterface.dropTable("knowledge_base");
    await queryInterface.dropTable("canned_responses");
    await queryInterface.dropTable("satisfaction_surveys");
    await queryInterface.dropTable("notifications");
    await queryInterface.dropTable("ticket_escalations");
    await queryInterface.dropTable("ticket_history");
    await queryInterface.dropTable("ticket_attachments");
    await queryInterface.dropTable("ticket_comments");
    await queryInterface.dropTable("tickets");
    await queryInterface.dropTable("categories");
    await queryInterface.dropTable("officer_scopes");
    await queryInterface.removeConstraint("hall_zones", "hall_zones_grievance_officer_id_fkey");
    await queryInterface.dropTable("users");
    await queryInterface.dropTable("halls");
    await queryInterface.dropTable("hall_zones");
    await queryInterface.dropTable("departments");
    await queryInterface.dropTable("faculties");
    await queryInterface.dropTable("campuses");
  }
};
