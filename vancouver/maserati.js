const playwright = require("playwright");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

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
  }
}

async function startCrawler() {
  const browser = await playwright.chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto(`https://www.maserativancouver.com/`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  let carCounter = 0;

  const newCarSelector = await page.isVisible(".menu-item-5260 > a");
  if (newCarSelector) {
    console.log("New car link selected...");
    await page.click(".menu-item-5260 > a");
    await page.waitForTimeout(10000);
  }

  const productSelector = ".item.active > a";
  await page.waitForTimeout(10000);
  const carLinks = await page.$$eval(productSelector, (links) =>
    links.map((link) => link.href)
  );

  console.log(`Found ${carLinks.length} car links`);
  for (const carLink of carLinks) {
    carCounter++;

    await page.goto(carLink, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    try {
      const urlPath = new URL(carLink).pathname;
      const carRegex = /\/vehicle\/(\d{4})-(\w+)-(\w+)-/;
      const carMatch = urlPath.match(carRegex);

      const Make = carMatch ? carMatch[2] : "Make Not Found";
      const Model = carMatch ? carMatch[3] : "Model Not Found";
      const Year = carMatch ? carMatch[1] : "Year Not Found";

      const Location = "Vancouver";

      const price = (await page.isVisible("span#final-price"))
        ? await page.locator("span#final-price").textContent()
        : "Not Available";
      const Price = `$${price}`;

      const CoverImage =
        (await page.locator("img[itemprop='image']").getAttribute("src")) ||
        "Not Available";

      await page.waitForSelector(".thumb img");
      const otherCarImages = await page.$$eval(".thumb img", (imgs) =>
        imgs.map((img) => img.src)
      );

      let BodyType = (await page.isVisible("td[itemprop='bodyType']"))
        ? await page.locator("td[itemprop='bodyType']").textContent()
        : "Not Available";

      BodyType = getMainBodyType(BodyType);

      const Engine = (await page.isVisible("td[itemprop='vehicleEngine']"))
        ? await page.locator("td[itemprop='vehicleEngine']").textContent()
        : "Not Available";

      const Mileage = (await page.isVisible(
        "td[itemprop='mileageFromOdometer']"
      ))
        ? await page.locator("td[itemprop='mileageFromOdometer']").textContent()
        : "Not Available";

      const Trim = (await page.isVisible("[itemprop='model'] span"))
        ? await page.locator("[itemprop='model'] span").textContent()
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

      const Drivetrain = (await page.isVisible(
        "div:nth-of-type(3) tr:nth-of-type(3) td.td-odd"
      ))
        ? await page
            .locator("div:nth-of-type(3) tr:nth-of-type(3) td.td-odd")
            .textContent()
        : "Not Available";

      const FuelType = (await page.isVisible("td[itemprop='fuelType']"))
        ? await page.locator("td[itemprop='fuelType']").textContent()
        : "Not Available";

      const Transmission = (await page.isVisible(
        "td[itemprop='vehicleTransmission']"
      ))
        ? await page.locator("td[itemprop='vehicleTransmission']").textContent()
        : "Not Available";

      const Stock_Number = (await page.isVisible("td[itemprop='sku']"))
        ? await page.locator("td[itemprop='sku']").textContent()
        : "Not Available";

      const carDetails = {
        car_url: carLink,
        car_id: uuidv4(),
        Location,
        Make: Make.toLowerCase(),
        Model: Model.toLowerCase(),
        Trim,
        Mileage,
        BodyType: BodyType.toLowerCase(),
        Year,
        Price,
        ExteriorColor,
        InteriorColor,
        Transmission,
        Drivetrain,
        FuelType,
        CoverImage,
        otherCarImages,
        Engine,
        Stock_Number,
      };

      console.log(`Car_Number: #${carCounter}`);
      cars.push(carDetails);
    } catch (error) {
      console.error(`Error scraping car at ${carLink}:`, error);
    }

    await page.waitForTimeout(5000);
  }
  await sendScrapedCarsToAPI(cars);

  await browser.close();
}

//       let previousHeight;
//       let newHeight = await page.evaluate(() => document.body.scrollHeight);
//       while (previousHeight !== newHeight) {
//         previousHeight = newHeight;
//         await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//         await page.waitForTimeout(3000);
//         newHeight = await page.evaluate(() => document.body.scrollHeight);

module.exports = {
  startCrawler,
};
