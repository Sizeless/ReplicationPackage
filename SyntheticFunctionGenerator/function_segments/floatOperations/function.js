async function func() {
  // START FUNCTION
  const rand = ~~(Math.random() * 100000000) + 10000;
  for (let i = 0; i < rand; i++) {
    Math.sin(i);
    Math.cos(i);
    Math.tan(i);
    Math.sqrt(i);
  }
  // END FUNCTION
}

(async () => {
  await func();
})();