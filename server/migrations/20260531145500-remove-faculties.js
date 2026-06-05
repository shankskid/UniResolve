"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("departments", "faculty_id");
    await queryInterface.dropTable("faculties");
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const uuidDefault = Sequelize.literal("gen_random_uuid()");

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

    await queryInterface.addColumn("departments", "faculty_id", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "faculties", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });
  }
};
