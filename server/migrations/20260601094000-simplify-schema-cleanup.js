"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    async function tableExists(name) {
      const tables = await queryInterface.showAllTables();
      return tables.map((table) => table.toString().toLowerCase()).includes(name.toLowerCase());
    }

    async function columnExists(table, column) {
      if (!(await tableExists(table))) {
        return false;
      }
      const description = await queryInterface.describeTable(table);
      return Object.prototype.hasOwnProperty.call(description, column);
    }

    async function safeRemoveColumn(table, column) {
      if (await columnExists(table, column)) {
        await queryInterface.removeColumn(table, column);
      }
    }

    async function safeDropTable(table) {
      if (await tableExists(table)) {
        await queryInterface.dropTable(table);
      }
    }

    await safeRemoveColumn("tickets", "campus_id");
    await safeRemoveColumn("users", "campus_id");
    await safeRemoveColumn("departments", "campus_id");
    await safeRemoveColumn("halls", "campus_id");
    await safeRemoveColumn("halls", "hall_zone_id");

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tickets_jurisdiction_type') THEN
          ALTER TYPE enum_tickets_jurisdiction_type RENAME TO enum_tickets_jurisdiction_type_old;
          CREATE TYPE enum_tickets_jurisdiction_type AS ENUM ('hall', 'department');
          ALTER TABLE tickets ALTER COLUMN jurisdiction_type TYPE enum_tickets_jurisdiction_type
            USING jurisdiction_type::text::enum_tickets_jurisdiction_type;
          DROP TYPE enum_tickets_jurisdiction_type_old;
        END IF;
      END $$;
    `);

    await safeDropTable("hall_zones");
    await safeDropTable("campuses");
    await safeDropTable("ticket_escalations");
    await safeDropTable("satisfaction_surveys");
    await safeDropTable("canned_responses");
    await safeDropTable("knowledge_base");
    await safeDropTable("ticket_checklist_items");
    await safeDropTable("resolution_checklists");

    await queryInterface.sequelize.transaction(async (transaction) => {
      const deletions = [
        "notifications",
        "ticket_history",
        "ticket_attachments",
        "ticket_comments",
        "tickets",
        "officer_assignments",
        "overseer_assignments",
        "password_reset_tokens",
        "categories",
        "halls",
        "departments"
      ];

      for (const table of deletions) {
        if (await tableExists(table)) {
          await queryInterface.sequelize.query(`DELETE FROM ${table}`, { transaction });
        }
      }

      if (await tableExists("users")) {
        await queryInterface.sequelize.query("DELETE FROM users WHERE role <> 'overseer'", { transaction });
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const uuidDefault = Sequelize.literal("gen_random_uuid()");

    await queryInterface.createTable("campuses", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: false },
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
      grievance_officer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.addColumn("departments", "campus_id", {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "campuses", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    await queryInterface.addColumn("halls", "campus_id", {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "campuses", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });
    await queryInterface.addColumn("halls", "hall_zone_id", {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "hall_zones", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    await queryInterface.addColumn("users", "campus_id", {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "campuses", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    await queryInterface.addColumn("tickets", "campus_id", {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "campuses", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tickets_jurisdiction_type') THEN
          ALTER TYPE enum_tickets_jurisdiction_type RENAME TO enum_tickets_jurisdiction_type_old;
          CREATE TYPE enum_tickets_jurisdiction_type AS ENUM ('hall', 'department', 'campus', 'university');
          ALTER TABLE tickets ALTER COLUMN jurisdiction_type TYPE enum_tickets_jurisdiction_type
            USING jurisdiction_type::text::enum_tickets_jurisdiction_type;
          DROP TYPE enum_tickets_jurisdiction_type_old;
        END IF;
      END $$;
    `);

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
  }
};
