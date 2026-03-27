"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "otp", {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      after: "photo",
    });

    await queryInterface.addColumn("users", "expiresAt", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      after: "otp",
    });

    await queryInterface.addColumn("users", "isVerified", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "expiresAt",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "otp");
    await queryInterface.removeColumn("users", "expiresAt");
    await queryInterface.removeColumn("users", "isVerified");
  },
};
