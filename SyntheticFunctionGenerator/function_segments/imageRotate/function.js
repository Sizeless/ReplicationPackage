async function func() {
  // START FUNCTION
  const sharp = require("sharp");
  const imgGen = require("js-image-generator");
  const randDimensions = [10, 20, 30, 40];
  const dimIdx = ~~(Math.random() * 4);
  const image = await new Promise(res => {
    imgGen.generateImage(randDimensions[dimIdx], randDimensions[dimIdx], 100, (err, image) => {
      res(image.data);
    })
  });
  await sharp(image).rotate(~~(Math.random() * 360) + 1).toBuffer();
  // END FUNCTION
}