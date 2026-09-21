const dns = require("node:dns");
require("dotenv").config();
if (process.env.FORCE_PUBLIC_DNS === "true") dns.setServers(["1.1.1.1", "8.8.8.8"]);
const { createApp } = require("./src/app");
const { connectDatabase } = require("./src/db");

const port = Number(process.env.PORT || 3000);
const app = createApp();

connectDatabase()
  .then(() => app.listen(port, () => console.log(`Agastyaveda is running at http://localhost:${port}`)))
  .catch((error) => {
    console.error("Unable to start Agastyaveda:", error);
    process.exitCode = 1;
  });
