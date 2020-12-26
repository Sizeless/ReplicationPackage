async function func() {
  // START FUNCTION
  const fs = require("fs");
  const { unzip } = require("zlib");
  const { promisify } = require('util');
  const decompress = promisify(unzip);
  const readBuffer = fs.readFileSync(`compressed${(~~(Math.random() * 9) + 1)}.gzip`);
  await decompress(readBuffer);
  // END FUNCTION
}

(async function () {
  await func();
})()