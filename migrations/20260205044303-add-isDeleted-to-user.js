'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'isDeleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull:false,
      after: 'last_seen'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'isDeleted');
  }
};
