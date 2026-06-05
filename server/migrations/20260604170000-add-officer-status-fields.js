"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "is_timed_out", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    await queryInterface.addColumn("users", "status_reason", {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("users", "is_timed_out");
    await queryInterface.removeColumn("users", "status_reason");
  }
};
