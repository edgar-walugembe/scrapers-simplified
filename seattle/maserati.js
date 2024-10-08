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

  await page.goto(`https://www.maseratiofseattle.com/`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const isAdFormVisible = await page.isVisible("div#closeForm");
  if (isAdFormVisible) {
    await page.click("div#closeForm");
    await page.waitForTimeout(3000);
  }

  let carCounter = 0;

  await page.hover("a#parent_2");
  await page.waitForSelector("a.searchinventorychild", { visible: true });
  await page.click("a.searchinventorychild");
  await page.waitForTimeout(120000);

  const productSelector = "a.hero-carousel__item--viewvehicle";
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
      const carName = (await page.isVisible("span.vehicle-title__make-model"))
        ? await page.locator("span.vehicle-title__make-model").textContent()
        : "Not Available";

      const Trim = (await page.isVisible("span.vehicle-title__trim"))
        ? await page.locator("span.vehicle-title__trim").textContent()
        : "Not Available";

      function getCarMakeAndModel(carName, carTrim) {
        const [make, ...modelParts] = carName.split(" ");
        const model = modelParts.join(" ") + " " + carTrim;
        return { make, model };
      }

      const { make: Make, model: Model } = getCarMakeAndModel(carName, Trim);

      const Year = (await page.isVisible("span.vehicle-title__year"))
        ? await page.locator("span.vehicle-title__year").textContent()
        : "No Year Found";

      const Location = "Seattle";

      const Price = (await page.isVisible(
        ".beforeLeadSubmission .priceBlockResponsiveDesktop span.priceBlocItemPriceValue.priceStakText--bold"
      ))
        ? await page
            .locator(
              ".beforeLeadSubmission .priceBlockResponsiveDesktop span.priceBlocItemPriceValue.priceStakText--bold"
            )
            .textContent()
        : "Not Available";

      await page.click("#thumbnail--desktop--0 img.thumbnail__image");
      await page.waitForSelector(".gallery-thumbnails img");
      const otherCarImages = await page.$$eval(
        ".gallery-thumbnails img",
        (imgs) => imgs.map((img) => img.src)
      );

      const CoverImage = otherCarImages[0];

      let BodyType = (await page.isVisible(
        ".info__item--body-style span.info__value"
      ))
        ? await page
            .locator(".info__item--body-style span.info__value")
            .textContent()
        : "Not Available";

      BodyType = getMainBodyType(BodyType);

      const ExteriorColor = (await page.isVisible(
        ".info__item--exterior-color span.info__value"
      ))
        ? (
            await page
              .locator(".info__item--exterior-color span.info__value")
              .textContent()
          )
            ?.trim()
            .replace(/\n+/g, " ")
        : "Not Available";

      const InteriorColor = (await page.isVisible(
        ".info__item--interior-color span.info__value"
      ))
        ? (
            await page
              .locator(".info__item--interior-color span.info__value")
              .textContent()
          )
            ?.trim()
            .replace(/\n+/g, " ")
        : "Not Available";

      const FuelType = (await page.isVisible(
        ".info__item--fuel-type span.info__value"
      ))
        ? await page
            .locator(".info__item--fuel-type span.info__value")
            .textContent()
        : "Not Available";

      const Transmission = (await page.isVisible(
        ".info__item--transmission span.info__value"
      ))
        ? await page
            .locator(".info__item--transmission span.info__value")
            .textContent()
        : "Not Available";

      const Stock_Number = (await page.isVisible(
        ".vehicle-identifiers__item--stock-number span.vehicle-identifiers__value"
      ))
        ? await page
            .locator(
              ".vehicle-identifiers__item--stock-number span.vehicle-identifiers__value"
            )
            .textContent()
        : "Not Available";

      const VIN = (await page.isVisible(
        ".vehicle-identifiers__item--vin span.vehicle-identifiers__value"
      ))
        ? await page
            .locator(
              ".vehicle-identifiers__item--vin span.vehicle-identifiers__value"
            )
            .textContent()
        : "Not Available";

      const carDetails = {
        car_url: carLink,
        car_id: uuidv4(),
        Location,
        Make: Make.toLowerCase(),
        Model: Model.toLowerCase(),
        Trim,
        BodyType: BodyType.toLowerCase(),
        Year,
        Price,
        ExteriorColor,
        InteriorColor,
        Transmission,
        FuelType,
        CoverImage,
        otherCarImages,
        Stock_Number,
        VIN,
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

module.exports = {
  startCrawler,
};