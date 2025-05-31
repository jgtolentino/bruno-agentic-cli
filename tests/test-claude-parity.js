const { exec } = require("child_process");

exec('node bin/bruno-clean.js "say hello"', (err, stdout, stderr) => {
  if (err) throw err;
  console.log("Raw Output:\n", stdout);
}); 