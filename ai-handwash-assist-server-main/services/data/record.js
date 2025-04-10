const microServer = require("micro-server");
const { datap, utils } = microServer.helper;
const { ObjectId } = require("mongodb");

/* 
{
    id
    rating
    points
}
*/
const append_rating = async ({ data }) => {
  console.log("/data/record/append_rating: ", data);
  if (Object.keys(data).indexOf("id") < 0) {
    const err = new Error("missing field. required field: id");
    err.code = 400;
    throw err;
  }
  const res = await datap.mongo.readid2("user_info", data.id);
  // just assume it is exist
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
  if(update_res?.step_video_file===undefined || update_res?.step_video_file===null){
    update_res.step_video_file=[];
  }
  if (
    update_res?.step_correctness === undefined ||
    update_res?.step_correctness === null
  ) {
    update_res.step_correctness = [];
  }
  if (
    update_res?.step_points === undefined ||
    update_res?.step_points === null
  ) {
    update_res.step_points = [];
  }
  if(update_res?.total===undefined || update_res?.total===null){
    update_res.total= 0;
  }
  if (
    update_res?.record_time === undefined ||
    update_res?.record_time === null
  ) {
    update_res.record_time = [];
  }
  if(!(data?.step_video_file===undefined || data?.step_video_file===null || data.step_video_file==='')){
    update_res.step_video_file.push(data.step_video_file);
  }
  update_res.record_time.push({
    timestamp: Date.now(),
    datestring: new Date().toLocaleString("zh-HK", {
      timeZone: "Asia/Hong_Kong",
    }),
  });
  const obj1 = { Step: data.rating };
  utils.logger.debug(obj1);
  update_res.step_correctness.push(obj1);
  const obj2 = { Step: data.points };
  utils.logger.debug(obj2);
  update_res.step_points.push(obj2);
  update_res.total = update_res.step_points.reduce((prev, cur) => {
    return prev + Number(cur.Step);
  }, 0);
  await datap.mongo.update("user_info", update_res);
  return {
    message: "successfully updated",
  };
};

const get_rank = async ({ data }) => {
  // Ensure the request contains the 'id' field; throw an error if missing.
  if (!data.id) {
    const err = new Error("Missing field: id is required");
    err.code = 400;
    throw err;
  }

  // Retrieve the current user's total score from the database using their ID.
  const res = await datap.mongo.readid2("user_info", data.id);

  if (!res) {
    const err = new Error("User data not found");
    err.code = 500;
    throw err;
  }
  const userScore = res.total || 0;
  const step_correctness = res.step_correctness || [];
  const step_points = res.step_points || [];
  const step_video_files = res.step_video_file || [];
  /*
  // Default the total and step_correctness fields if not present
  const userScore = res.total && res.total.length > 0 ? res.total[res.total.length - 1] : 0;
  const step_correctness = res.step_correctness && res.step_correctness.length >= 7 ? res.step_correctness.slice(-7) : [];
  const step_video_files = res.step_video_file && res.step_video_file.length >= 7 ? res.step_video_file.slice(-7) : [];
  */

  // Fetch all users from the database.
  const allUsers = await datap.mongo.read("user_info", {});
   // 把所有用户的 `total` 数组展开成一个大数组
  const allScores = allUsers.flatMap(user =>
    Array.isArray(user.total) 
    ? user.total.map(score => score * (100 / 7)) 
    : [user.total]
  ).filter(score => score !== undefined && score !== null);
  if (!allScores || allScores.length === 0) {
    const err = new Error("No user data found");
    err.code = 500;
    throw err;
  }

  // Calculate how many users the current user has outperformed.
  const totalTests = allScores.length;
  const beatenScores = allScores.filter(score => score <= userScore).length;
  // Percentage of users the current user has beaten.
  let rankPercentage = (beatenScores / totalTests) * 100; 
  if (userScore >= 35) {rankPercentage = 100;}
  if (userScore <= 0) {rankPercentage = 0;} 

  // Maintain the original logic for determining user rank based on score.
  let rankLevel = "Novice";
  if (userScore > 25) {
    rankLevel = "Master";
  } else if (userScore > 15) {
    rankLevel = "Pro";
  }
  console.log("当前用户的分数 userScore:", userScore);
  console.log("所有用户的分数 allScores:", allScores);

  // Return both the user rank level and percentage of users beaten.
  return {
    userScore,
    totalTests,
    beatenScores,
    rankLevel,
    rankPercentage,
    step_points,
    step_correctness,
    step_video_files
  };
};

module.exports = {
  append_rating,
  get_rank,
};