"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "registration_number", {
      type: Sequelize.DataTypes.STRING(100),
      allowNull: true
    });

    await queryInterface.addIndex("users", ["registration_number"], {
      unique: true,
      name: "users_registration_number_unique",
      where: {
        registration_number: { [Sequelize.Op.ne]: null }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "users_registration_number_unique");
    await queryInterface.removeColumn("users", "registration_number");
  }
};
