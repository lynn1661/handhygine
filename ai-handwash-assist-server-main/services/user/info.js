const microServer = require("micro-server");
const { datap,utils } = microServer.helper;
const isLogEnabled=require('micro-server').config.log===true;
const bcrypt = require('bcrypt');
const saltRounds = 10;

// 异步加密密码
//const hashedPassword = await bcrypt.hash(data.password, saltRounds);

const fill=async({data})=>{
    if(Object.keys(data).indexOf('ID')<0 || Object.keys(data).indexOf('password')<0){
        const err = new Error("missing field. required field: ID and password");
        err.code = 400;
        throw err;
    }
    if(data.ID==='' || data.password===''){
        const err = new Error("empty field detected ! please check if there is no empty field !");
        err.code = 400;
        throw err;
    }
    const obj={
        studentID:data.ID,
        password:data.password,
        start_time:Date.now(),
    }
    const res=await datap.mongo.create('student_info',obj);
    if(!res.acknowledged){
        const err=new Error('cannot save');
        err.code=500;
        throw err;
    }
    return {
        message:'Successfully Login',
        ID:res.insertedId
    }
}

module.exports={fill}
