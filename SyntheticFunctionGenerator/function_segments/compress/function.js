async function func() {
  // START FUNCTION
  const lorem = new (require("lorem-ipsum").LoremIpsum)();
  const { deflate } = require("zlib");
  const { promisify } = require('util');
  const defl = promisify(deflate);
  const readStream = Buffer.from(lorem.generateParagraphs(~~(Math.random() * 9) + 1));
  await defl(readStream);
  // END FUNCTION
}

(async function () {
  await func();
})()