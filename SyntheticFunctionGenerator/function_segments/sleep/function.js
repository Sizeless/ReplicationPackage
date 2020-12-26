exports.sleep = async () => {
  // START FUNCTION
  const sleepDuration = ~~(Math.random() * 5) + 1;
  return new Promise(resolve => {
    setTimeout(resolve, sleepDuration * 100);
  });
  // END FUNCTION
}