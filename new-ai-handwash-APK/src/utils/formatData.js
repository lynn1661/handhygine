export function getTime(value) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const randomSixDigitNumber = Math.floor(100000 + Math.random() * 900000);
  const formattedDate = `${year}${month}${day}-${randomSixDigitNumber}-${value}`;
  return formattedDate;
}
export function validateaccountID(accountID) {
  // 定义验证格式的正则表达式
  var regex = /^[0-9]{8}[a-zA-Z]$/;
  // 使用正则表达式进行验证
  if (regex.test(accountID)) {
    return true;
  } else {
    return false;
  }
}
