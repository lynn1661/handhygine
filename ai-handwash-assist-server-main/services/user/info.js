const microServer = require("micro-server");
const { datap,utils } = microServer.helper;
const isLogEnabled=require('micro-server').config.log===true;
const bcrypt = require('bcrypt');
const storedHashedPassword = "$2b$10$2w9C6rCedSuCFls1x4BcU.iS2XUAZ8V4.BZ35DASFwYcbyTlMOLwK";

const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要加1并补0
const day = String(date.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`; // 格式为 "2025-03-10"

const login = async({ data }) => {
    if (!data.ID || !data.password) {
      const err = new Error("missing field. required field: ID and password");
      err.code = 400;
      throw err;
    }
    // 验证身份 用户名称后续可修改
    if (data.ID === "user" && await bcrypt.compare(data.password, storedHashedPassword)) {
      return { message: "Successfully Login", ID: data.ID };
    } else {
      const err = new Error("Invalid credentials");
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
        studentID:data.accountID,
        userID:data.userID,
        role:data.role,
        date: formattedDate,
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
