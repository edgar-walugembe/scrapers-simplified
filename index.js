const fs = require("fs");
const path = require("path");

// Use __dirname in CommonJS, no need to redefine it
const rootDir = __dirname;

async function runAllScrapers() {
  try {
    const cityFolders = fs.readdirSync(rootDir).filter((folder) => {
      const folderPath = path.join(rootDir, folder);
      return fs.statSync(folderPath).isDirectory();
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

runAllScrapers();
