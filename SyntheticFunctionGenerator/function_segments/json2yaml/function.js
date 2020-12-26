async function func() {
  // START FUNCTION
  const YAML = require("json-to-pretty-yaml");
  const rand = ~~(Math.random() * 5) + 1;
  const json = require(`${rand}.json`);
  YAML.stringify(json);
  // END FUNCTION
}