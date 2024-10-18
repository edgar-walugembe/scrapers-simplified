const playwright = require("playwright");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const cron = require("node-cron");

function getMainBodyType(bodyType) {
  const bodyTypes = {
    hatchback: [
      "3-door hatchback",
      "5-door hatchback",
      "compact hatchback",
      "subcompact hatchback",
    ],
    suv: [
      "suv",
      "crossover",
      "compact suv",
      "midsize suv",
      "full-size suv",
      "off-road suv",
      "luxury suv",
      "subcompact suv",
    ],
    coupe: [
      "coupe",
      "sport utility",
      "sports-utility",
      "sports coupe",
      "grand tourer",
      "hardtop coupe",
      "luxury coupe",
      "performance coupe",
    ],
    truck: [
      "truck",
      "crew cab",
      "pickup truck",
      "pickup",
      "light duty truck",
      "heavy duty truck",
      "extended cab",
      "extended cab truck",
      "compact truck",
      "off-road truck",
      "full-size truck",
    ],
    sedan: [
      "compact sedan",
      "subcompact sedan",
      "midsize sedan",
      "full-size sedan",
      "executive sedan",
      "luxury sedan",
      "sports sedan",
    ],
    wagon: [
      "wagon",
      "super-wagon",
      "station wagon",
      "estate wagon",
      "sports wagon",
      "crossover wagon",
      "luxury wagon",
    ],
    convertible: [
      "convertible",
      "roadster",
      "cabriolet",
      "hardtop convertible",
      "soft-top convertible",
      "targa",
      "2-seater convertible",
    ],
    van: [
      "van",
      "minivan",
      "passenger van",
      "cargo van",
      "full-size van",
      "compact van",
      "conversion van",
      "camper van",
    ],
  };

  try {
    bodyType = bodyType.toLowerCase().replace(/[-\s]+/g, " ");

    for (let mainType in bodyTypes) {
      if (mainType === bodyType || bodyTypes[mainType].includes(bodyType)) {
        return mainType;
      }
    }

    throw new Error("Body type not found");
  } catch (error) {
    return "Not Available";
  }
}

const cars = [];

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function sendScrapedCarsToAPI(cars) {
  const chunkSize = 10;
  const url = "https://scraper-db-api.onrender.com/cars/new-cars";
  const carChunks = chunkArray(cars, chunkSize);

  for (const chunk of carChunks) {
    try {
      const response = await axios.post(url, {
        cars: chunk,
      });
      console.log("Cars successfully added:", response.data);
    } catch (error) {
      console.error("Error adding cars:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100; // Scroll 100px at a time
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300); // Scroll every 100ms
    });
  });
}

async function startCrawler() {
  const browser = await playwright.chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto(`https://www.advantageford.ca/new/`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const isChatVisible = await page.isVisible("span.close.pointer");
  if (isChatVisible) {
    await page.click("span.close.pointer");
    await page.waitForTimeout(3000);
  }

  const isPopupVisible = await page.isVisible("div.pc-dismiss-button.left");
  if (isPopupVisible) {
    await page.click("div.pc-dismiss-button.left");
    await page.waitForTimeout(3000);
  }

  const isMessageVisible = await page.isVisible("span.close.show");
  if (isMessageVisible) {
    await page.click("span.close.show");
    await page.waitForTimeout(3000);
  }

  let carCounter = 0;

  let previousHeight = await page.evaluate("document.body.scrollHeight");
  let reachedEnd = false;

  while (!reachedEnd) {
    await autoScroll(page);
    await page.waitForTimeout(2000);

    let newHeight = await page.evaluate("document.body.scrollHeight");

    if (newHeight === previousHeight) {
      reachedEnd = true;
    }
    previousHeight = newHeight;
  }

  const productSelector = "a[data-loc='vehicle details']";
  const carLinks = await page.$$eval(productSelector, (links) =>
    links.map((link) => link.href)
  );

  console.log(`Found ${carLinks.length} car links`);
  for (const carLink of carLinks) {
    carCounter++;

    await page.goto(carLink, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    try {
      function extractYearMakeModel(url) {
        const path = new URL(url).pathname;
        const regex =
          /\/vehicle\/(\d+)-([a-z]+)-([a-z]+)-([a-z-]+)-id\d+\.htm/i;
        const match = path.match(regex);

        if (match) {
          const Year = match[1];
          const Make = match[2];
          const Model = match[3];
          const Trim = match[4].replace(/-/g, " ");

          return { Year, Make, Model, Trim };
        } else {
          return null;
        }
      }
      const { Year, Make, Model, Trim } = extractYearMakeModel(carLink) || {};

      const Location = "Calgary";

      const price = (await page.isVisible("span#final-price"))
        ? await page.locator("span#final-price").textContent()
        : "Not Available";
      const Price = `$${price}`;

      let BodyType = (await page.isVisible("td[itemprop='bodyType']"))
        ? await page.locator("td[itemprop='bodyType']").textContent()
        : "Not Available";
      BodyType = getMainBodyType(BodyType);

      const Engine = (await page.isVisible("td[itemprop='vehicleEngine']"))
        ? await page.locator("td[itemprop='vehicleEngine']").textContent()
        : "Not Available";

      const Drivetrain = (await page.isVisible(
        "div.col-xs-12:nth-of-type(3) tr:nth-of-type(3) td.td-odd"
      ))
        ? await page
            .locator("div.col-xs-12:nth-of-type(3) tr:nth-of-type(3) td.td-odd")
            .textContent()
        : "Not Available";

      const Transmission = (await page.isVisible(
        "td[itemprop='vehicleTransmission']"
      ))
        ? await page.locator("td[itemprop='vehicleTransmission']").textContent()
        : "Not Available";

      const FuelType = (await page.isVisible("td[itemprop='fuelType']"))
        ? await page.locator("td[itemprop='fuelType']").textContent()
        : "Not Available";

      const VIN = (await page.isVisible("td[itemprop='productID']"))
        ? await page.locator("td[itemprop='productID']").textContent()
        : "Not Available";

      const Stock_Number = (await page.isVisible("td[itemprop='sku']"))
        ? await page.locator("td[itemprop='sku']").textContent()
        : "Not Available";

      const ExteriorColor = (await page.isVisible("td[itemprop='color']"))
        ? await page.locator("td[itemprop='color']").textContent()
        : "Not Available";

      const InteriorColor = (await page.isVisible(
        "td[itemprop='vehicleInteriorColor']"
      ))
        ? await page
            .locator("td[itemprop='vehicleInteriorColor']")
            .textContent()
        : "Not Available";

      const CoverImage =
        (await page.locator("img[itemprop='image']").getAttribute("src")) ||
        "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

      let otherCarImages = [];
      await page.waitForSelector(".thumb img");
      otherCarImages = await page.$$eval(".thumb img", (imgs) =>
        imgs.map((img) => img.src)
      );

      const carDetails = {
        car_url: carLink,
        car_id: uuidv4(),
        Location,
        Make: Make ? Make.toLowerCase() : "Not Available",
        Model: Model ? Model.toLowerCase() : "Not Available",
        Trim: Trim ? Trim.toLowerCase() : "Not Available",
        BodyType: BodyType || "Not Available",
        Year: Year || "Not Available",
        Price,
        ExteriorColor,
        InteriorColor,
        Transmission,
        FuelType,
        Drivetrain,
        Engine,
        CoverImage,
        otherCarImages,
        VIN,
        Stock_Number,
      };

      console.log(`Car_Number: #${carCounter}`);
      console.log(carDetails);
      cars.push(carDetails);
    } catch (error) {
      console.error(`Error scraping car at ${carLink}:`, error);
    }

    await page.waitForTimeout(5000);
  }
  await sendScrapedCarsToAPI(cars);

  await browser.close();
}
// startCrawler();

module.exports = {
  startCrawler,
};

// cron.schedule(
//   "10 3 * * *",
//   async () => {
//     try {
//       console.log("Starting the crawler at 3:10 AM");
//       await startCrawler();
//       console.log("Crawler finished running");
//     } catch (error) {
//       console.error("Error with scheduled crawler run:", error);
//     }
//   },
//   {
//     timezone: "America/Toronto",
//   }
// );