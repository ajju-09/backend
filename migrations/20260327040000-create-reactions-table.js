"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reactions", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      msg_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "messages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      emoji: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Ensure a user can only react once per message
    await queryInterface.addConstraint("reactions", {
      fields: ["msg_id", "user_id"],
      type: "unique",
      name: "unique_reaction_per_user_per_message",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reactions");
  },
};
