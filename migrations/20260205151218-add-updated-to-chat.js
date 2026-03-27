"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chats", "updatedAt", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW, 
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("chats", "updatedAt");
  },
};
