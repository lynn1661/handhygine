const microServer = require("micro-server");
const { datap,utils } = microServer.helper;
const isLogEnabled=require('micro-server').config.log===true;
const { ObjectId } = require("mongodb");

const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要加1并补0
const day = String(date.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`; // 格式为 "2025-03-10"

const getRankList = async ({ data }) => {
    const role = data.role || "Doctor";

    // 构造过滤条件
    const filter = {
      studentID: "user",// 指定user name
      role: role,
      date: formattedDate,
    };
  
    // 构造排序条件: total 从高到低 (-1 表示降序)
    const sort = { total: -1 };
  
    // 调用数据库读取接口，假设参数依次为：集合名称、过滤条件、limit、skip、排序条件
    const records = await datap.mongo.read("student_info", filter, null, null, sort);
    
    return {
      message: "Successfully retrieved rank list",
      records,
    };
  };
  
  module.exports = { getRankList };