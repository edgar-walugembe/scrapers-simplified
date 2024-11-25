const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const rootDir = __dirname;

async function runAllScrapers() {
  try {
    const excludedFolders = [
      "node_modules",
      ".git",
      ".vscode",
      "views",
      "public",
      "routes",
      "bin",
    ];

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

runAllScrapers();

// // cron.schedule(
// //   "0 * * * *",
// //   async () => {
// //     console.log("Running scheduled scrapers...");
// //     await runAllScrapers();
// //     console.log("Finished running scrapers.");
// //   },
// //   {
// //     timezone: "Africa/Nairobi",
// //   }
// // );

// // console.log("Cron job set up to run every hour in EAT.");

// const fs = require("fs");
// const path = require("path");
// const { exec } = require("child_process"); // Import child_process for executing commands
// const cron = require("node-cron");

// const rootDir = __dirname;

// async function runAllScrapers() {
//   try {
//     const excludedFolders = [
//       "node_modules",
//       ".git",
//       ".vscode",
//       "views",
//       "public",
//       "routes",
//       "bin",
//     ];

//     const cityFolders = fs.readdirSync(rootDir).filter((folder) => {
//       const folderPath = path.join(rootDir, folder);
//       return (
//         fs.statSync(folderPath).isDirectory() &&
//         !excludedFolders.includes(folder)
//       );
//     });

//     for (const city of cityFolders) {
//       const cityPath = path.join(rootDir, city);
//       console.log(`Processing city: ${city}`);

//       const files = fs
//         .readdirSync(cityPath)
//         .filter((file) => file.endsWith(".js"));

//       for (const file of files) {
//         const filePath = path.join(rootDir, city, file);

//         try {
//           console.log(`Running scraper: ${file} for city: ${city}`);

//           // Wrap scraper execution with xvfb-run
//           await new Promise((resolve, reject) => {
//             const command = `xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" node ${filePath}`;
//             exec(command, (error, stdout, stderr) => {
//               if (error) {
//                 console.error(
//                   `Error running scraper for ${file} in ${city}:`,
//                   stderr
//                 );
//                 reject(error);
//               } else {
//                 console.log(stdout);
//                 resolve();
//               }
//             });
//           });
//         } catch (error) {
//           console.error(`Error running scraper for ${file} in ${city}:`, error);
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Error running scrapers:", error);
//   }
// }

// runAllScrapers();

// // Uncomment to enable cron job scheduling
// // cron.schedule(
// //   "0 * * * *",
// //   async () => {
// //     console.log("Running scheduled scrapers...");
// //     await runAllScrapers();
// //     console.log("Finished running scrapers.");
// //   },
// //   {
// //     timezone: "Africa/Nairobi",
// //   }
// // );

// // console.log("Cron job set up to run every hour in EAT.");
