async function func() {
  // START FUNCTION
  const mathjs = require("mathjs");
  const dimensions = [25, 50, 75, 100, 125];
  const roll = ~~(Math.random() * 5);
  const matrix1 = mathjs.random([dimensions[roll], dimensions[roll]]);
  const matrix2 = mathjs.random([dimensions[roll], dimensions[roll]]);
  mathjs.multiply(matrix1, matrix2);
  // END FUNCTION
}