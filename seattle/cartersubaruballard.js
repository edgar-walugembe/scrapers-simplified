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

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/geolocation/**", (route) => route.abort());

  await page.goto(
    `https://www.cartersubaruballard.com/search/new-subaru-seattle-wa/?s:df=1&ct=60&cy=98107&tp=new`,
    {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    }
  );

  await page.isVisible('input[type="checkbox"]');
  await page.click("input[type='checkbox']");
  await page.waitForTimeout(3000);

  await page.waitForSelector("select.results_per_page_controls__select");
  await page.selectOption("select.results_per_page_controls__select", "All");
  await page.waitForTimeout(10000);

  const isPopupVisible = await page.isVisible(
    "a.ui-dialog-titlebar-close.ui-corner-all"
  );
  if (isPopupVisible) {
    await page.click("a.ui-dialog-titlebar-close.ui-corner-all");
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

  const isSurveyFormVisible = await page.isVisible("button#ip-no");
  if (isSurveyFormVisible) {
    await page.click("button#ip-no");
    await page.waitForTimeout(3000);
  }

  const isAdFormVisible = await page.isVisible("div#closeXBtnImg.close-icon");
  if (isAdFormVisible) {
    await page.click("div#closeXBtnImg.close-icon");
    await page.waitForTimeout(3000);
  }

  const productSelector = "a.loopslider__inner_container";
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

    await page.waitForSelector("div.features_snapshot__detail_node", {
      timeout: 30000,
    });

    try {
      function extractCarDetails(url) {
        const path = new URL(url).pathname;
        const regex = /\/new-(\d+)-([a-z]+)-([a-z]+)-/i;
        const match = path.match(regex);

        if (match) {
          const year = match[1];
          const make = match[2];
          const model = match[3];

          return { year, make, model };
        } else {
          return null;
        }
      }
      const { year, make, model } = extractCarDetails(carLink) || {};

      const Year = year || "Year Not Found";
      const Make = make || "Make Not Found";
      const Model = model || "Model Not Found";

      const Location = "Seattle";

      const Price = (await page.isVisible("dt:nth-of-type(6) + dd"))
        ? await page.locator("dt:nth-of-type(6) + dd").textContent()
        : "Not Available";

      const Mileage = (await page.isVisible(
        "div.features_snapshot__detail_node:nth-of-type(1) div.features_snapshot__detail"
      ))
        ? await page
            .locator(
              "div.features_snapshot__detail_node:nth-of-type(1) div.features_snapshot__detail"
            )
            .textContent()
        : "Not Available";

      const Trim = (await page.isVisible(
        "div.features_snapshot__detail_node:nth-of-type(2) div.features_snapshot__detail"
      ))
        ? await page
            .locator(
              "div.features_snapshot__detail_node:nth-of-type(2) div.features_snapshot__detail"
            )
            .textContent()
        : "Not Available";

      const ExteriorColor = (await page.isVisible(
        "div.features_snapshot__detail_node:nth-of-type(5) div.features_snapshot__detail"
      ))
        ? await page
            .locator(
              "div.features_snapshot__detail_node:nth-of-type(5) div.features_snapshot__detail"
            )
            .textContent()
        : "Not Available";

      const InteriorColor = (await page.isVisible(
        "div.features_snapshot__detail_node:nth-of-type(6) div.features_snapshot__detail"
      ))
        ? await page
            .locator(
              "div.features_snapshot__detail_node:nth-of-type(6) div.features_snapshot__detail"
            )
            .textContent()
        : "Not Available";

      const VIN = (await page.isVisible(
        "div:nth-of-type(4) div.features_snapshot__detail"
      ))
        ? await page
            .locator("div:nth-of-type(4) div.features_snapshot__detail")
            .textContent()
        : "Not Available";

      const Stock_Number = (await page.isVisible(
        "div.features_snapshot__detail_node:nth-of-type(3) div.features_snapshot__detail"
      ))
        ? await page
            .locator(
              "div.features_snapshot__detail_node:nth-of-type(3) div.features_snapshot__detail"
            )
            .textContent()
        : "Not Available";

      const Doors = (await page.isVisible(
        "div:nth-of-type(7) div.features_snapshot__detail"
      ))
        ? await page
            .locator("div:nth-of-type(7) div.features_snapshot__detail")
            .textContent()
        : "Not Available";

      const Seats = (await page.isVisible(
        "div:nth-of-type(8) div.features_snapshot__detail"
      ))
        ? await page
            .locator("div:nth-of-type(8) div.features_snapshot__detail")
            .textContent()
        : "Not Available";

      await page.click("div[data-accordion_label='SPECIFICATIONS']", {
        timeout: 60000,
      });

      const Drivetrain = (await page.isVisible(
        "div.two_column_list__item--last:nth-of-type(2) .two_column_list__definition span"
      ))
        ? await page
            .locator(
              "div.two_column_list__item--last:nth-of-type(2) .two_column_list__definition span"
            )
            .textContent()
            .then((text) => text.trim())
        : "Not Available";

      const isImageIconVisible = await page.isVisible(
        "div.vehicle_loopslider__gallery_controls"
      );
      let otherCarImages = [];
      if (isImageIconVisible) {
        try {
          await page.click("div.vehicle_loopslider__gallery_controls");
          await page.waitForTimeout(3000);
          if (
            await page.isVisible(
              "div.view_all_images_wrapper:nth-of-type(n+2) > img"
            )
          ) {
            await page.waitForSelector(
              "div.view_all_images_wrapper:nth-of-type(n+2) > img"
            );
            otherCarImages = await page.$$eval(
              "div.view_all_images_wrapper:nth-of-type(n+2) > img",
              (imgs) => imgs.map((img) => img.src)
            );
          }
        } catch (error) {
          console.log("Error fetching additional images:", error);
        }
      } else {
        console.log(`Zoom Icon absent for car at: ${carLink}`);
      }

      const CoverImage =
        otherCarImages[0] ||
        "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

      const carDetails = {
        car_url: carLink,
        car_id: uuidv4(),
        Location,
        Make,
        Model,
        Trim: Trim.toLowerCase(),
        Mileage,
        Year: Year,
        Price,
        ExteriorColor,
        InteriorColor,
        Drivetrain,
        CoverImage,
        otherCarImages,
        Stock_Number,
        VIN,
        Doors,
        Seats,
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
