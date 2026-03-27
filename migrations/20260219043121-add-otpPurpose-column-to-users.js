"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "otp_purpose", {
      type: Sequelize.ENUM("signup", "forgot_password"),
      defaultValue: null,
      allowNull: true,
      after: "photo",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "otp_purpose");
  },
};
