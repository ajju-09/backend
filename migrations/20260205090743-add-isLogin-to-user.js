'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.addColumn('users', 'isLogin', {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    after: 'isDeleted'
   })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'isLogin');
  }
};
