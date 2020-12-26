exports.default = async () => {
  // START FUNCTION
  const { v4: uuidv4 } = require('uuid');
  const fileSizes = [256000, 512000, 768000, 1024000];
  const fs = require("fs");
  const fileSize = fileSizes[~~(Math.random() * 4)];
  const data = []
  for (let i = 0; i < fileSize; i++) {
    data.push(~~(Math.random() * 256));
  }
  const filename = uuidv4()
  fs.writeFileSync(`/tmp/${filename}.bin`, Buffer.from(data));
  fs.unlinkSync(`/tmp/${filename}.bin`);
  // START FUNCTION
}