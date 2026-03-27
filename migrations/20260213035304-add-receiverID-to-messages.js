"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // await queryInterface.addColumn("messages", "receiver_id", {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   after: "sender_id",
    // });

    await queryInterface.addColumn("messages", "reply_to", {
      type: Sequelize.INTEGER,
      references:{
        model: "messages",
        key: "id"
      },
      allowNull: true,
      after: "image_url",
    });
  },

  async down(queryInterface, Sequelize) {
    // await queryInterface.removeColumn("messages", "receiver_id");
    await queryInterface.removeColumn("messages", "reply_to");
  },
};
