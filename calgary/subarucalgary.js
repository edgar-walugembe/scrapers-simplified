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

  await page.goto(
    `https://www.subarucalgary.com/vehicles/new/?st=year,desc&view=grid&sc=new`,
    {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    }
  );

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

  const productSelector = "a.vehicle-card__cta";
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
      const urlParts = carLink.split("/");
      const Year = urlParts[4];
      const Make = urlParts[5];
      const Model = urlParts[6];

      const Location = "Calgary";

      const Trim = (await page.isVisible("a.vdp-breadcrumbs__disabled"))
        ? await page.locator("a.vdp-breadcrumbs__disabled").textContent()
        : "Not Available";

      const CoverImage =
        (await page
          .locator("div.photo-gallery__main > img")
          .getAttribute("src")) ||
        "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

      const isZoomIconVisible = await page.isVisible(
        "i.photo-gallery__zoom-icon"
      );
      let otherCarImages = [];
      if (isZoomIconVisible) {
        try {
          await page.click("i.photo-gallery__zoom-icon");
          await page.waitForTimeout(3000);
          if (await page.isVisible("img.vgs__gallery__container__img")) {
            await page.waitForSelector("img.vgs__gallery__container__img");
            otherCarImages = await page.$$eval(
              "img.vgs__gallery__container__img",
              (imgs) => imgs.map((img) => img.src)
            );
          }
        } catch (error) {
          console.log("Error fetching additional images:", error);
        }
      } else {
        console.log(`Zoom Icon absent for car at: ${carLink}`);
      }

      const Mileage = (await page.isVisible(
        "[data-spec='odometer'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='odometer'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const ExteriorColor = (await page.isVisible(
        "[data-spec='exterior_color'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='exterior_color'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const InteriorColor = (await page.isVisible(
        "[data-spec='interior_color'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='interior_color'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const Engine = (await page.isVisible(
        "[data-spec='engine'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='engine'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const Transmission = (await page.isVisible(
        "[data-spec='transmission'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='transmission'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const Drivetrain = (await page.isVisible(
        "[data-spec='drive_train'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='drive_train'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const VIN = (await page.isVisible(
        "[data-spec='vin'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='vin'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const Stock_Number = (await page.isVisible(
        "[data-spec='stock_number'] span.detailed-specs__value"
      ))
        ? await page
            .locator("[data-spec='stock_number'] span.detailed-specs__value")
            .textContent()
        : "Not Available";

      const Description = (await page.isVisible(
        "p.description-tab__description"
      ))
        ? await page.locator("p.description-tab__description").textContent()
        : "Not Available";
      // add content here

      const carDetails = {
        car_url: carLink,
        car_id: uuidv4(),
        Location,
        Make: Make.toLowerCase(),
        Model: Model.toLowerCase(),
        Trim: Trim.toLowerCase(),
        Mileage,
        Year,
        ExteriorColor,
        InteriorColor,
        Transmission,
        Drivetrain,
        CoverImage,
        otherCarImages,
        Engine,
        Stock_Number,
        VIN,
        Description,
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

startCrawler();

// module.exports = {
//   startCrawler,
// };
