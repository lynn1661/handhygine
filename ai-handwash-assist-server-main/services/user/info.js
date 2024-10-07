const microServer = require("micro-server");
const { datap,utils } = microServer.helper;
const isLogEnabled=require('micro-server').config.log===true;

const fill=async({data})=>{
    if(Object.keys(data).indexOf('ID')<0 || Object.keys(data).indexOf('subject')<0 || Object.keys(data).indexOf('department')<0){
        const err = new Error("missing field. required field: ID,subject and department");
        err.code = 400;
        throw err;
    }
    if(data.ID==='' || data.subject==='' || data.department===''){
        const err = new Error("empty field detected ! please check if there is no empty field !");
        err.code = 400;
        throw err;
    }
    // const idCheck=new RegExp("\\d{8}[A-Z]",'g')
    // if(!idCheck.test(data.ID)){
    //     const err = new Error("Wrong input for the student ID ! it should contains 8 numbers and one UPPERCASE character");
    //     err.code = 400;
    //     throw err; 
    // }
    // const noNumAllows=new RegExp('\\d+','g');
    // if(noNumAllows.test(data.name) || noNumAllows.test(data.subject)){
    //     const err = new Error("no number allows in name and subject ! please check about if you have enter any number in both field");
    //     err.code = 400;
    //     throw err; 
    // }
    // const noSpecialAllows=new RegExp("(\\!|\\@|\\#|\\$|\\%|\\^|\\&|\\*|\\(|\\)|\\-|\\_|\\+|\\=|\\/|\\?|\\.|\\,|\\<|\\>|\\;|\\:|\\'|\\\"|\\[|\\]|\\{|\\})+",'g');
    // if(noSpecialAllows.test(data.name) || noSpecialAllows.test(data.subject)){
    //     const err = new Error("no special characters allows in name and subject ! please check about if you have enter any number in both field");
    //     err.code = 400;
    //     throw err; 
    // }
    const obj={
        studentID:data.ID,
        start_time:Date.now(),
        department:data.department,
        subject:data.subject,
        program:data.program
    }
    const res=await datap.mongo.create('student_info',obj);
    if(!res.acknowledged){
        const err=new Error('cannot save');
        err.code=500;
        throw err;
    }
    return {
        message:'successfully created',
        ID:res.insertedId
    }
}

module.exports={fill}
