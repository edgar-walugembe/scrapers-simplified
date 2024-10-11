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
    `https://www.jpsubarunorthshore.com/vehicles/new/?view=grid&sc=new`,
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

  const productSelector = "a.vehicle-card__image-link.gtm_vehicle_title_cta";
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
          /\/vehicles\/(\d+)\/([a-z-]+)\/([a-z-]+)\/([a-z-]+)\/([a-z]+)\/\d+\//i;
        const match = path.match(regex);

        if (match) {
          const Year = match[1];
          const Make = match[2];
          const Model = match[3];

          return { Year, Make, Model };
        } else {
          return null;
        }
      }
      const { Year, Make, Model } = extractYearMakeModel(carLink) || {};

      const Location = "Vancouver";

      const Price = (await page.isVisible(".price-block__price--xl span.df"))
        ? await page.locator(".price-block__price--xl span.df").textContent()
        : "Not Available";

      const Mileage = (await page.isVisible(".col[data-spec='odometer'] p"))
        ? await page.locator(".col[data-spec='odometer'] p").textContent()
        : "Not Available";

      const Trim = (await page.isVisible("a.vdp-breadcrumbs__disabled"))
        ? await page.locator("a.vdp-breadcrumbs__disabled").textContent()
        : "Not Available";

      let BodyType = (await page.isVisible(".col[data-spec='body_style'] p"))
        ? await page.locator(".col[data-spec='body_style'] p").textContent()
        : "Not Available";

      BodyType = getMainBodyType(BodyType);

      const Engine = (await page.isVisible(".col[data-spec='engine'] p"))
        ? await page.locator(".col[data-spec='engine'] p").textContent()
        : "Not Available";

      const Drivetrain = (await page.isVisible(
        ".col[data-spec='drive_train'] p"
      ))
        ? await page.locator(".col[data-spec='drive_train'] p").textContent()
        : "Not Available";

      const Transmission = (await page.isVisible(
        ".col[data-spec='transmission'] p"
      ))
        ? await page.locator(".col[data-spec='transmission'] p").textContent()
        : "Not Available";

      const FuelType = (await page.isVisible(".col[data-spec='fuel_type'] p"))
        ? await page.locator(".col[data-spec='fuel_type'] p").textContent()
        : "Not Available";

      const VIN = (await page.isVisible(
        "span.overview-group__item:nth-of-type(2)"
      ))
        ? await page
            .locator("span.overview-group__item:nth-of-type(2)")
            .textContent()
        : "Not Available";

      const Stock_Number = (await page.isVisible(
        "	span.overview-group__item:nth-of-type(1)"
      ))
        ? await page
            .locator("	span.overview-group__item:nth-of-type(1)")
            .textContent()
        : "Not Available";

      const ExteriorColor = (await page.isVisible(
        ".col[data-spec='manu_exterior_color'] p"
      ))
        ? await page
            .locator(".col[data-spec='manu_exterior_color'] p")
            .textContent()
        : "Not Available";

      const isViewImagesButtonVisible = await page.isVisible(
        "div.photo-gallery__buttons-container.photo-gallery__buttons-container--right"
      );
      let otherCarImages = [];
      if (isViewImagesButtonVisible) {
        try {
          await page.click(
            "div.photo-gallery__buttons-container.photo-gallery__buttons-container--right"
          );
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
        console.log(`ViewImages  button absent for car at: ${carLink}`);
      }

      const CoverImage =
        otherCarImages[0] ||
        "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

      const carDetails = {
        car_url: carLink,
        car_id: uuidv4(),
        Location,
        Make: Make ? Make.toLowerCase() : "Not Available",
        Model: Model ? Model.toLowerCase() : "Not Available",
        Trim: Trim.toLowerCase(),
        BodyType: BodyType || "Not Available",
        Mileage,
        Year: Year || "Not Available",
        Price,
        ExteriorColor,
        Transmission,
        FuelType,
        Drivetrain,
        Engine,
        CoverImage,
        otherCarImages,
        VIN: VIN || "Not Available",
        Stock_Number: Stock_Number || "Not Available",
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

startCrawler();

// module.exports = {
//   startCrawler,
// };