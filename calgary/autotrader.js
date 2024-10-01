const playwright = require("playwright");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
dotenv.config();

async function startCrawler() {
  const browser = await playwright.chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto(
    `https://www.autotrader.ca/cars/ab/calgary/?rcp=15&rcs=0&srt=35&prx=100&prv=Alberta&loc=calgary&hprc=True&wcp=True&sts=New&showcpo=1&inMarket=advancedSearch`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  (await page.waitForSelector(".close-button")).click();
  await page.waitForTimeout(10000);

  (await page.waitForSelector("select#pageSize")).click();
  await page.selectOption("select#pageSize", "100");
  await page.waitForTimeout(10000);

  let hasNextPage = true;

  while (hasNextPage) {
    // Handle pop-up if it appears
    const isPopupVisible = await page.isVisible(".ng-binding");
    if (isPopupVisible) {
      console.log("Pop-up detected. Cancelling...");
      await page.click(".ng-binding");
      await page.waitForTimeout(3000);
    }

    // Get all car listing links on the current page
    const productSelector = ".dealer-split-wrapper > a";
    const carLinks = await page.$$eval(productSelector, (links) =>
      links.map((link) => link.href)
    );

    console.log(`Found ${carLinks.length} car links`);

    for (const carLink of carLinks) {
      await page.goto(carLink, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Scrape Car Details.
      try {
        const urlParts = carLink.split("/");
        const Make = urlParts[4] || "Not Available";

        const carNameWithTrim = (await page.isVisible("h1.hero-title"))
          ? await page.locator("h1.hero-title").textContent()
          : "Not Available";

        const Trim = (await page.isVisible("span#spec-value-2"))
          ? await page.locator("span#spec-value-2").textContent()
          : "Not Available";

        function getCarName(carNameWithTrim, Trim) {
          const trimIndex = carNameWithTrim.indexOf(Trim);
          if (trimIndex !== -1) {
            return carNameWithTrim.substring(0, trimIndex).trim();
          } else {
            return carNameWithTrim;
          }
        }
        const carName = getCarName(carNameWithTrim, Trim);

        const pattern = /\b\d{4}\b/;
        const match = carName.match(pattern);
        const Year = match ? match[0] : "No Year Found";

        function getCarModel(carNameWithTrim, Trim) {
          const carNameNoYear = carNameWithTrim.replace(/\b\d{4}\b/, "").trim();
          const words = carNameNoYear.split(" ");
          const model = words.slice(1, words.indexOf(Trim)).join(" ");
          return model || "Model Not Found";
        }
        const Model = getCarModel(carNameWithTrim, Trim);

        const Location = "Calgary";

        const CoverImage =
          (await page.locator("img#mainPhoto.loaded").getAttribute("src")) ||
          "Not Available";

        await page.click("img#mainPhoto.loaded");
        await page.waitForSelector(".gallery-thumbnail img");
        const otherCarImages = await page.$$eval(
          ".gallery-thumbnail img",
          (imgs) => imgs.map((img) => img.src)
        );

        const Status = (await page.isVisible("span#spec-value-1"))
          ? await page.locator("span#spec-value-1").textContent()
          : "Not Available";

        const BodyType = (await page.isVisible("span#spec-value-3"))
          ? await page.locator("span#spec-value-3").textContent()
          : "Not Available";

        const Engine = (await page.isVisible("span#spec-value-4"))
          ? await page.locator("span#spec-value-4").textContent()
          : "Not Available";

        const Drivetrain = (await page.isVisible("span#spec-value-7"))
          ? await page.locator("span#spec-value-7").textContent()
          : "Not Available";

        const price = (await page.isVisible(".hero-price"))
          ? await page.locator(".hero-price").textContent()
          : "Not Available";
        const Price = `$${price}`;

        const Mileage = (await page.isVisible("span#spec-value-0"))
          ? await page.locator("span#spec-value-0").textContent()
          : "Not Available";

        const Doors = (await page.isVisible("span#spec-value-11"))
          ? await page.locator("span#spec-value-11").textContent()
          : "Not Available";

        //confirm whether received text is not a number
        const isTextOnly = (text) => /^[A-Za-z\s]+$/.test(text.trim());

        const validExteriorColor = (await page.isVisible("span#spec-value-9"))
          ? await page.locator("span#spec-value-9").textContent()
          : "Not Available";
        const ExteriorColor = isTextOnly(validExteriorColor)
          ? validExteriorColor
          : "Not Available";

        const validInteriorColor = (await page.isVisible("span#spec-value-10"))
          ? await page.locator("span#spec-value-10").textContent()
          : "Not Available";
        const InteriorColor = isTextOnly(validInteriorColor)
          ? validInteriorColor
          : "Not Available";

        const validFuelType = (await page.isVisible("span#spec-value-12"))
          ? await page.locator("span#spec-value-12").textContent()
          : "Not Available";
        const FuelType = isTextOnly(validFuelType)
          ? validFuelType
          : "Not Available";

        const Transmission = (await page.isVisible("span#spec-value-6"))
          ? await page.locator("span#spec-value-6").textContent()
          : "Not Available";

        const Stock_Number = (await page.isVisible("span#spec-value-8"))
          ? await page.locator("span#spec-value-8").textContent()
          : "Not Available";

        const Description = (await page.isVisible(
          "div#vdp-collapsible-short-text"
        ))
          ? await page.locator("div#vdp-collapsible-short-text").textContent()
          : "Not Available";

        const carDetails = {
          car_url: carLink,
          car_id: uuidv4(),
          Location,
          Make,
          Model,
          Trim,
          Mileage,
          BodyType,
          Year,
          Status,
          Price,
          ExteriorColor,
          InteriorColor,
          Transmission,
          CoverImage,
          otherCarImages,
          Engine,
          Drivetrain,
          FuelType,
          Stock_Number,
          Doors,
          Description,
        };

        console.log(carDetails);
      } catch (error) {
        console.error(`Error scraping car at ${carLink}:`, error);
      }
      await page.waitForTimeout(5000);
    }

    const nextPageSelector = "a.last-page-link";
    const isNextPage = await page.$(nextPageSelector);

    if (isNextPage) {
      console.log("Navigating to the next page...");
      await page.click(nextPageSelector);
      await page.waitForTimeout(30000);
    } else {
      console.log("No more pages to navigate.");
      hasNextPage = false;
    }
  }

  await browser.close();
}

startCrawler();

// requestHandler: async ({ request, page, log, enqueueLinks }) => {
//     console.log(`Processing: ${request.url}`);
//     if (request.label === "DETAIL") {
//       //when in the car details page
//       console.log(`Extracting data: ${request.url}`);

//       const urlParts = request.url.split("/");
//       const Make = urlParts[4] || "Not Available";

//       const carNameWithTrim =
//         (await page.locator("h1.hero-title").textContent()) ||
//         "Not Available";

//       const Trim =
//         (await page.locator("span#spec-value-2").textContent()) ||
//         "Not Available";

//       function getCarName(carNameWithTrim, Trim) {
//         const trimIndex = carNameWithTrim.indexOf(Trim);

//         if (trimIndex !== -1) {
//           return carNameWithTrim.substring(0, trimIndex).trim();
//         } else {
//           return carNameWithTrim;
//         }
//       }
//       const carName = getCarName(carNameWithTrim, Trim);

//       const pattern = /\b\d{4}\b/;
//       const match = carName.match(pattern);
//       const Year = match ? match[0] : "No Year Found";

//       function getCarModel(carNameWithTrim, Trim) {
//         const carNameNoYear = carNameWithTrim.replace(/\b\d{4}\b/, "").trim();

//         const words = carNameNoYear.split(" ");

//         const brand = words[0];
//         const model = words.slice(1, words.indexOf(Trim)).join(" ");

//         return model || "Model Not Found";
//       }
//       const Model = getCarModel(carNameWithTrim, Trim);

//       const Location = "Calgary";

//       const CoverImage =
//         (await page.locator("img#mainPhoto.loaded").getAttribute("src")) ||
//         "Not Available";

//       await page.click("img#mainPhoto.loaded");
//       await page.waitForSelector(".gallery-thumbnail img");
//       const otherCarImages = await page.$$eval(
//         ".gallery-thumbnail img",
//         (imgs) => imgs.map((img) => img.src)
//       );

//       const Status =
//         (await page.locator("span#spec-value-1").textContent()) ||
//         "Not Available";

//       const BodyType =
//         (await page.locator("span#spec-value-3").textContent()) ||
//         "Not Available";

//       const Engine =
//         (await page.locator("span#spec-value-4").textContent()) ||
//         "Not Available";

//       const Drivetrain =
//         (await page.locator("span#spec-value-7").textContent()) ||
//         "Not Available";

//       const price =
//         (await page.locator(".hero-price").textContent()) || "Not Available";
//       const Price = `$${price}`;

//       const Mileage =
//         (await page.locator("span#spec-value-0").textContent()) ||
//         "Not Available";

//       const Doors =
//         (await page.locator("span#spec-value-11").textContent()) ||
//         "Not Available";

//       const ExteriorColor =
//         (await page.locator("span#spec-value-9").textContent()) ||
//         "Not Available";

//       const InteriorColor =
//         (await page.locator("span#spec-value-10").textContent()) ||
//         "Not Available";

//       const FuelType =
//         (await page.locator("span#spec-value-12").textContent()) ||
//         "Not Available";

//       const Transmission =
//         (await page.locator("span#spec-value-6").textContent()) ||
//         "Not Available";

//       const Stock_Number =
//         (await page.locator("span#spec-value-8").textContent()) ||
//         "Not Available";

//       const Description =
//         (await page
//           .locator("div#vdp-collapsible-short-text")
//           .textContent()) || "Not Available";

//       const carDetails = {
//         car_url: request.url,
//         car_id: uuidv4(),
//         Location,
//         Make,
//         Model,
//         Trim,
//         Mileage,
//         BodyType,
//         Year,
//         Status,
//         Price,
//         ExteriorColor,
//         InteriorColor,
//         Transmission,
//         CoverImage,
//         otherCarImages,
//         Engine,
//         Drivetrain,
//         FuelType,
//         Stock_Number,
//         Doors,
//         Description,
//       };

//       console.log(`Saving data: ${request.url}`);
//       console.log(carDetails);
//     } else {
//       //when on the website's home page
//       console.log(`Enqueueing car listings for: ${request.url}`);

//       const productSelector = ".dealer-split-wrapper > a";
//       await page.waitForSelector(productSelector);
//       await enqueueLinks({
//         selector: productSelector,
//         label: "DETAIL",
//       });

//       const nextPageSelector = "a.last-page-link";
//       const nextButton = await page.$(nextPageSelector);
//       if (nextButton) {
//         await enqueueLinks({
//           selector: nextPageSelector,
//         });
//       }
//     }
//   },
// });

// await crawler.run([
//   "https://www.autotrader.ca/cars/ab/calgary/?rcp=15&rcs=0&srt=35&prx=100&prv=Alberta&loc=calgary&hprc=True&wcp=True&sts=New&showcpo=1&inMarket=advancedSearch",
// ]);
// }

// module.exports = {
//   startCrawler,
// };
// startCrawler();

// class for pop-up "ng-binding"
