"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const uuidDefault = Sequelize.literal("gen_random_uuid()");

    await queryInterface.sequelize.query("ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'officer'");
    await queryInterface.sequelize.query("ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'overseer'");
    await queryInterface.sequelize.query("ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'superadmin'");

    await queryInterface.addColumn("tickets", "scope_type", {
      type: DataTypes.ENUM("hall", "department"),
      allowNull: true
    });

    await queryInterface.addColumn("tickets", "scope_id", {
      type: DataTypes.UUID,
      allowNull: true
    });

    await queryInterface.createTable("officer_assignments", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      officer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      scope_type: { type: DataTypes.ENUM("hall", "department"), allowNull: false },
      scope_id: { type: DataTypes.UUID, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.addConstraint("officer_assignments", {
      fields: ["scope_type", "scope_id"],
      type: "unique",
      name: "officer_assignments_scope_unique"
    });

    await queryInterface.createTable("overseer_assignments", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: uuidDefault },
      overseer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      officer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.addConstraint("overseer_assignments", {
      fields: ["overseer_id", "officer_id"],
      type: "unique",
      name: "overseer_assignments_pair_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("overseer_assignments");
    await queryInterface.dropTable("officer_assignments");
    await queryInterface.removeColumn("tickets", "scope_id");
    await queryInterface.removeColumn("tickets", "scope_type");
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_tickets_scope_type");
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_officer_assignments_scope_type");
  }
};
