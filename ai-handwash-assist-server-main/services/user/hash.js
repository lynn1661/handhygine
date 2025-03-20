const bcrypt = require("bcrypt");
const saltRounds = 10;
const password = "pass"; // 这里替换为你的明文密码

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("加密失败:", err);
  } else {
    console.log("加密后的密码:", hash);
  }
});