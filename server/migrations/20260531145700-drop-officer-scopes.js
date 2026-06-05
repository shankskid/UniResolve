"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("officer_scopes");
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const uuidDefault = Sequelize.literal("gen_random_uuid()");

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
  }
};
