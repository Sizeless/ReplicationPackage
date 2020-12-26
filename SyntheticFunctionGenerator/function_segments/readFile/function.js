exports.default = async () => {
  // START FUNCTION
  const fs = require("fs");
  const path = require("path");
  const fileName = `file-${~~(Math.random() * 4) + 1}.bin`
  fs.readFileSync(path.resolve(__dirname, fileName));
  // END FUNCTION
}