const microServer = require("micro-server");
const { datap, utils } = microServer.helper;
const { ObjectId } = require("mongodb");

/**
 * 提交评分 API
 * 接收的数据格式例如：
 * {
 *   data: {
 *     id: "用户记录的唯一标识",   // 可以是 MongoDB 的 _id 字符串
 *     rating: 3.5               // 用户评分
 *   }
 * }
 */
const rating = async ({ data }) => {
  // 验证必须字段
  if (!data.id || data.rating === undefined || data.rating === null) {
    const err = new Error("Missing field. Required fields: id and rating.");
    err.code = 400;
    throw err;
  }

  // 根据传入的 id 查找用户记录（假设使用 readid2 函数根据 _id 查找）
  const record = await datap.mongo.readid2("user_info", data.id);
  if (!record) {
    const err = new Error("Record not found");
    err.code = 404;
    throw err;
  }

  // 更新记录
  // 如果已有评分记录，可以选择覆盖或者进行累加/平均等操作，这里简单将评分覆盖更新
  const updateObj = {
    _id: ObjectId(data.id),  
    rating: data.rating
  };

  // 更新数据库记录
  const updateRes = await datap.mongo.update("user_info", updateObj);

  if (!updateRes.acknowledged) {
    const err = new Error("Failed to update rating");
    err.code = 500;
    throw err;
  }

  return {
    message: "Rating successfully submitted",
    rating: data.rating,
    id: record._id
  };
};

module.exports = { rating };