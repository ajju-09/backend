const { Reaction } = require("../models");

const findOneReaction = async (query) => {
  const data = await Reaction.findOne(query);
  return data;
};

const createReaction = async (data) => {
  const reaction = await Reaction.create(data);
  return reaction;
};

const destroyReaction = async (query) => {
  const data = await Reaction.destroy(query);
  return data;
};

const findAllReactions = async (query) => {
  const data = await Reaction.findAll(query);
  return data;
};

const updateReaction = async (data, query) => {
  const result = await Reaction.update(data, query);
  return result;
};

module.exports = {
  Reaction,
  findOneReaction,
  createReaction,
  destroyReaction,
  findAllReactions,
  updateReaction,
};
