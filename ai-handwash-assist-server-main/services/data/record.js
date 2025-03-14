const microServer = require("micro-server");
const { datap, utils } = microServer.helper;
const { ObjectId } = require("mongodb");

/* 
{
    id
    rating
    is_last
}
*/
const append_rating = async ({ data }) => {
  console.log("/data/record/append_rating: ", data);
  if (Object.keys(data).indexOf("id") < 0) {
    const err = new Error("missing field. required field: id");
    err.code = 400;
    throw err;
  }
  const res = await datap.mongo.readid2("student_info", data.id);
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
  if(update_res?.total===undefined || update_res?.total===null){
    update_res.total=[];
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
  const obj = { Step: data.rating };
  utils.logger.debug(obj);
  update_res.step_correctness.push(obj);
  if (
    !(data?.is_last === undefined || data?.is_last === null) &&
    data.is_last === true
  ) {
    update_res.total.push(
      update_res.step_correctness.slice(update_res.step_correctness.length-7).reduce((prev, cur) => {
        switch (cur.Step.toLowerCase()) {
          case "perfect":
            return (prev += 1);
          case "good":
            return (prev += 0.5);
          case "need improvement":
          case "fail":
            return (prev += 0);
          default:
            return prev;
        }
      }, 0)
    );
  }
  await datap.mongo.update("student_info", update_res);
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
  const res = await datap.mongo.readid2("student_info", data.id);

  if (!res) {
    const err = new Error("User data not found");
    err.code = 500;
    throw err;
  }

  // Default the total and step_correctness fields if not present
  const userScore = res.total && res.total.length > 0 ? res.total[res.total.length - 1] : 0;
  const step_correctness = res.step_correctness && res.step_correctness.length >= 7 ? res.step_correctness.slice(-7) : [];
  const step_video_files = res.step_video_file && res.step_video_file.length >= 7 ? res.step_video_file.slice(-7) : [];

  // Fetch all users from the database.
  const allUsers = await datap.mongo.read("student_info", {});
   // 把所有用户的 `total` 数组展开成一个大数组
  const allScores = allUsers.flatMap(user => user.total || []);
  if (!allScores || allScores.length === 0) {
    const err = new Error("No user data found");
    err.code = 500;
    throw err;
  }

  // Calculate how many users the current user has outperformed.
  const totalTests = allScores.length;
  const beatenScores = allScores.filter(score => score <= userScore).length;

  let rankPercentage = 0;
  if (userScore >= 7) {
    rankPercentage = 100;
  } else if (userScore <= 0){
    rankPercentage = 0;
  } else {
    rankPercentage = (beatenScores / totalTests) * 100;  // Percentage of users the current user has beaten.
  }
  // Maintain the original logic for determining user rank based on score.
  let rankLevel = "Novice";
  if (userScore > 5) {
    rankLevel = "Master";
  } else if (userScore > 3) {
    rankLevel = "Pro";
  }
  console.log("当前用户的 total 数组:", res.total);
  console.log("当前用户的最终分数 userScore:", userScore);
  console.log("所有用户的分数 allScores:", allScores);

  // Return both the user rank level and percentage of users beaten.
  return {
    userScore,
    totalTests,
    beatenScores,
    rankLevel,  // User's rank (Novice, Pro, or Master)
    rankPercentage,  // Percentage of users the current user has beaten
    step_correctness,  // Steps accuracy
    step_video_files  // Video file paths
  };
};

module.exports = {
  append_rating,
  get_rank,
};
