const microServer = require("micro-server");
const { datap, utils } = microServer.helper;
const { ObjectId } = require("mongodb");


const rating = async ({ data }) => {
  // 验证必须字段
  if (!data.id || data.rating === undefined || data.rating === null) {
    const err = new Error("Missing field. Required fields: id and rating.");
    err.code = 400;
    throw err;
  }

  // 根据传入的 id 查找用户记录（假设使用 readid2 函数根据 _id 查找）
  const res = await datap.mongo.readid2("user_info", data.id);
  if (!res) {
    const err = new Error("Record not found");
    err.code = 404;
    throw err;
  }
  var update_res = res;
  update_res.id = update_res._id;
  delete update_res._id;
  if (
    !(
      update_res?.lastModified === undefined ||
      update_res?.lastModified === null
    )
  ) {
    delete update_res.lastModified;
  }
  utils.logger.debug(update_res);
  if (update_res?.rating === undefined || update_res?.rating === null) {
    update_res.rating = {
      ui: 0,
      training: 0,
      recommend: 0
    };
  }
  
  // 更新记录
  // 如果已有评分记录，可以选择覆盖或者进行累加/平均等操作，这里简单将评分覆盖更新
  update_res.rating=data.rating;
  // 更新数据库记录
  const updateRes = await datap.mongo.update("user_info", update_res);
  //console.log("updateRes ", updateRes );
  //console.log("update_res ", update_res )
  if (!updateRes.acknowledged) {
    const err = new Error("Failed to update rating");
    err.code = 500;
    throw err;
  }

  return {
    message: "Rating successfully submitted",
    rating: data.rating,
    id: data.id
  };
};

// 新增函数：获取所有用户的评分数据
const get_ratings = async ({ data }) => {
  try {
    // 构建查询条件，支持日期范围过滤
    let query = {};
    
    // 如果提供了日期范围，添加到查询条件
    if (data?.dateRange) {
      const { start, end } = data.dateRange;
      if (start && end) {
        // 创建日期时间戳范围
        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999); // 设置结束日期为当天的最后一刻
        
        // 使用record_time字段进行筛选
        query = {
          "record_time.timestamp": {
            $gte: startDate.getTime(),
            $lte: endDate.getTime()
          }
        };
      }
    }
    
    // 查询所有带有评分数据的用户记录
    const allUsers = await datap.mongo.read("user_info", query);
    
    // 提取并格式化评分数据
    const ratingCategories = {
      UI: [],
      Training: [],
      Recommendation: []
    };
    
    const usersWithRatings = allUsers.filter(user => user.rating && 
      (user.rating.ui > 0 || user.rating.training > 0 || user.rating.recommend > 0));
    
    // 收集所有评分数据
    usersWithRatings.forEach(user => {
      if (user.rating) {
        // 将评分数据标准化为0-100分
        const uiScore = user.rating.ui * 20; // 5分制转为100分制
        const trainingScore = user.rating.training * 20;
        const recommendScore = user.rating.recommend * 20;
        
        if (user.rating.ui > 0) ratingCategories.UI.push(uiScore);
        if (user.rating.training > 0) ratingCategories.Training.push(trainingScore);
        if (user.rating.recommend > 0) ratingCategories.Recommendation.push(recommendScore);
      }
    });
    
    // 计算每个类别的统计数据
    const calculateStats = (scores) => {
      if (!scores.length) return { count: 0, average: 0, max: 0, min: 0 };
      
      return {
        count: scores.length,
        average: parseFloat((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)),
        max: Math.max(...scores),
        min: Math.min(...scores)
      };
    };
    
    // 为每个类别计算统计数据
    const result = {
      totalUsers: usersWithRatings.length,
      ratingsByCategory: {
        UI: {
          scores: ratingCategories.UI,
          stats: calculateStats(ratingCategories.UI)
        },
        Training: {
          scores: ratingCategories.Training,
          stats: calculateStats(ratingCategories.Training)
        },
        Recommendation: {
          scores: ratingCategories.Recommendation,
          stats: calculateStats(ratingCategories.Recommendation)
        }
      }
    };
    
    return result;
  } catch (error) {
    console.error('获取评分数据失败:', error);
    const err = new Error("Failed to retrieve ratings data");
    err.code = 500;
    throw err;
  }
};

module.exports = { rating, get_ratings };