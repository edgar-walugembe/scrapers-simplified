const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const rootDir = __dirname;

async function runAllScrapers() {
  try {
    const excludedFolders = ["node_modules", ".git", ".vscode"];

    const cityFolders = fs.readdirSync(rootDir).filter((folder) => {
      const folderPath = path.join(rootDir, folder);
      return (
        fs.statSync(folderPath).isDirectory() &&
        !excludedFolders.includes(folder)
      );
    });

    for (const city of cityFolders) {
      const cityPath = path.join(rootDir, city);
      console.log(`Processing city: ${city}`);

      const files = fs
        .readdirSync(cityPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of files) {
        try {
          const { startCrawler } = require(path.join(rootDir, city, file));
          console.log(`Running scraper: ${file} for city: ${city}`);
          await startCrawler();
        } catch (error) {
          console.error(`Error running scraper for ${file} in ${city}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error running scrapers:", error);
  }
}

cron.schedule(
  "50 1 * * *",
  async () => {
    console.log("Running scheduled scrapers...");
    await runAllScrapers();
    console.log("Finished running scrapers.");
  },
  {
    timezone: "Africa/Nairobi",
  }
);

console.log("Cron job set up to run every day at 4:50 AM EAT.");
