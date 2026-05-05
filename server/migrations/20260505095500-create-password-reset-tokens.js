"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("password_reset_tokens", {
      id: { type: Sequelize.DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal("gen_random_uuid()") },
      user_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      token_hash: { type: Sequelize.DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DataTypes.DATE, allowNull: false },
      used_at: { type: Sequelize.DataTypes.DATE, allowNull: true },
      created_at: { type: Sequelize.DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("password_reset_tokens");
  }
};
