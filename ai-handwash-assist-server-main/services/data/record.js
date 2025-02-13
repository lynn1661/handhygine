const microServer = require("micro-server");
const { datap, utils } = microServer.helper;
const { ObjectId } = require("mongodb");

/**
 * Handles user test scores and stores them
 *  - Now stores all historical test scores instead of only keeping the latest one
 *  - Each test is recorded separately and included in ranking calculations
 */
const append_rating = async ({ data }) => {
  console.log("/data/record/append_rating: ", data);

  // Ensure the ID field is provided
  if (!data.id) {
    const err = new Error("Missing field: id is required");
    err.code = 400;
    throw err;
  }

  // Retrieve user data (if not found, create a new record)
  const res = await datap.mongo.readid2("student_info", data.id);
  let update_res = res || { id: data.id, step_correctness: [], total: [], record_time: [] };

  // Initialize empty fields if they do not exist
  if (!update_res.step_correctness) update_res.step_correctness = [];
  if (!update_res.total) update_res.total = [];
  if (!update_res.record_time) update_res.record_time = [];
  if (!update_res.step_video_file) update_res.step_video_file = [];

  // Record test timestamp
  update_res.record_time.push({
    timestamp: Date.now(),
    datestring: new Date().toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" }),
  });

  // Store the test result
  const obj = { Step: data.rating };
  update_res.step_correctness.push(obj);

  // Calculate the total score based on the most recent 7 steps
  const score = update_res.step_correctness.slice(-7).reduce((prev, cur) => {
    switch (cur.Step.toLowerCase()) {
      case "perfect": return prev + 1;
      case "good": return prev + 0.5;
      case "you can do better":
      case "fail": return prev;
      default: return prev;
    }
  }, 0);

  // Store the total score
  update_res.total.push(score);

  await datap.mongo.update("student_info", update_res);

  return { message: "Successfully updated" };
};

/**
 * Retrieves the ranking based on all historical test records
 *  - Now considers all test records, not just the user's latest score
 *  - Uses "greater than or equal to" logic for ranking calculation
 *  - Ensures full-score users get 100% ranking, and lowest scores get 0%
 */

const get_rank = async ({ data }) => {
  if (!data.id) {
    const err = new Error("Missing field: id is required");
    err.code = 400;
    throw err;
  }

  // Retrieve user data
  const res = await datap.mongo.readid2("student_info", data.id);
  if (!res || !res.total || res.total.length === 0) {
    const err = new Error("User data not found or no test records");
    err.code = 500;
    throw err;
  }

  // Get the latest test score of the user
  const userScore = res.total[res.total.length - 1];

  // Retrieve all test records from all users (not just their latest scores)
  const allRecords = await datap.mongo.read("student_info", {});
  const allScores = allRecords.flatMap(user => user.total || []);

  if (!allScores || allScores.length === 0) {
    const err = new Error("No valid test records found");
    err.code = 500;
    throw err;
  }

  // Count how many test scores are less than or equal to the user's score
  const beatenScores = allScores.filter(score => score <= userScore).length;
  const totalTests = allScores.length;

  // Ensure ranking logic:
  // - Full score (7) users get 100% ranking
  // - Lowest score (0) users get 0% ranking
  let rankPercentage = (beatenScores / totalTests) * 100;
  if (userScore >= 7) rankPercentage = 100;
  if (userScore <= 0) rankPercentage = 0;

  // Determine user rank level
  let rankLevel = "Novice";
  if (userScore > 5) rankLevel = "Master";
  else if (userScore > 3) rankLevel = "Pro";

  return {
    rankLevel,  // User's rank (Novice, Pro, or Master)
    rankPercentage,  // Percentage of test scores beaten by this result
    step_correctness: res.step_correctness.slice(-7),  // Last 7 test results
    step_video_files: res.step_video_file ? res.step_video_file.slice(-7) : [] // Last 7 video files
  };
};

// Export the module
module.exports = {
  append_rating,
  get_rank,
};