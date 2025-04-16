const microServer = require("micro-server");
const { datap,utils } = microServer.helper;
const isLogEnabled=require('micro-server').config.log===true;
const bcrypt = require('bcrypt');

const login = async ({ data }) => {
  // 验证必须字段： accountID 和 password
  if (!data.accountID || !data.password) {
    const err = new Error("Missing field. Required fields: accountID and password");
    err.code = 400;
    throw err;
  }

  // 根据传入的 accountID 查询用户记录
  const records = await datap.mongo.read("account", { accountID: data.accountID });
  if (!records || records.length === 0) {
    const err = new Error("Invalid ID");
    err.code = 401;
    throw err;
  }
  
  // 假设 accountID 唯一，取第一个匹配的记录
  const user = records[0];
  // 使用 bcrypt.compare 对比前端密码和数据库中存储的加密密码
  const isValid = await bcrypt.compare(data.password, user.password);
  if (isValid) {
    return { message: "Successfully Login", ID: user.accountID };
  } else {
    const err = new Error("Paasword wrong");
    err.code = 401;
    throw err;
  }
};

const fill=async({data})=>{
    if(Object.keys(data).indexOf('accountID')<0){
        const err = new Error("missing field. required field: accountID");
        err.code = 400;
        throw err;
    }
    if(data.accountID==='' || data.role===''){
        const err = new Error("empty field detected !");
        err.code = 400;
        throw err;
    }
    const obj={
        accountID:data.accountID,
        userID:data.userID,
        role:data.role,
        start_time:new Date().toLocaleString("zh-HK", {
            timeZone: "Asia/Hong_Kong",
        }),
    }
    const res=await datap.mongo.create('user_info',obj);
    if(!res.acknowledged){
        const err=new Error('cannot save');
        err.code=500;
        throw err;
    }
    return {
        message:'Successfully Choose Role',
        ID:res.insertedId
    }
}

module.exports={login, fill}
