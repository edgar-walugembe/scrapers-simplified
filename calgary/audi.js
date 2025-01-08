const playwright = require("playwright");
const randomUseragent = require("random-useragent");
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
      "sport utility",
      "sports-utility",
    ],
    coupe: [
      "coupe",
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

async function sendCarToBubble(car) {
  const baseUrl =
    "https://voxcar-65775.bubbleapps.io/version-test/api/1.1/obj/cars";
  const queryUrl = `${baseUrl}?constraints=${encodeURIComponent(
    JSON.stringify([
      { key: "car_url", constraint_type: "equals", value: car.car_url },
    ])
  )}`;

  try {
    const checkResponse = await axios.get(queryUrl, {
      headers: {
        Authorization: `Bearer c4c07d395bea869723bc9c530c4ea849`,
      },
    });

    if (checkResponse.data.response.results.length > 0) {
      console.log(`Car with URL ${car.car_url} is already in the database.`);
      return;
    }

    const response = await axios.post(baseUrl, car, {
      headers: {
        Authorization: `Bearer 6af869f6680291881c0d8fbcfa686ff3`,
      },
    });

    console.log("Car successfully added:", response.data);
  } catch (error) {
    console.error("Error adding car:", error.message);
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

const startCrawler = async () => {
  console.log(`audi:calgary started`);

  const userAgent = randomUseragent.getRandom();

  // audi crawler doesn't require proxy
  const browser = await playwright.chromium.launch({
    headless: true,
  });

  console.log(`browser opened`);
  const context = await browser.newContext({ userAgent: userAgent });
  const page = await context.newPage({ bypassCSP: true });
  await page.setDefaultTimeout(30000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(`https://www.glenmoreaudi.com/new-inventory/index.htm`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  let carCounter = 0;

  let previousHeight = await page.evaluate("document.body.scrollHeight");
  let reachedEnd = false;

  while (!reachedEnd) {
    console.log(`scrolling started`);
    await autoScroll(page);
    await page.waitForTimeout(2000);

    let newHeight = await page.evaluate("document.body.scrollHeight");

    if (newHeight === previousHeight) {
      reachedEnd = true;
    }
    previousHeight = newHeight;
    console.log(`scrolling end`);

    const productSelector = "div.vehicle-card-media-container-carousel a";
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
        function extractCarDetails(url) {
          const regex = /\/new\/([\w-]+)\/(\d{4})-([\w-]+)/;
          const match = url.match(regex);

          if (match) {
            let [_, make, year, model] = match;
            model = model.replace(/-/g, " ");
            model = model
              .split(" ")
              .find((word) => word.toLowerCase() !== make.toLowerCase());

            return {
              year,
              make: make.replace(/-/g, " "),
              model,
            };
          } else {
            throw new Error("URL does not match the expected pattern.");
          }
        }
        const { year, make, model } = extractCarDetails(carLink) || {};

        const Year = year || "Year Not Found";
        const Make = make || "Make Not Found";
        const Model = model || "Model Not Found";

        const Location = "Calgary";

        const Price = (await page.isVisible("span.price-value"))
          ? await page.locator("span.price-value").textContent()
          : "Not Available";

        const TrimExtract = (await page.isVisible("span.ddc-font-size-jumbo"))
          ? await page.locator("span.ddc-font-size-jumbo").textContent()
          : "Not Available";
        const Trim = TrimExtract?.replace(
          new RegExp(`\\b${model}\\b`, "i"),
          ""
        ).trim();

        function extractBodyTypeAndSeats(combinedData) {
          if (combinedData && combinedData !== "Not Available") {
            const [bodyType, seatsWithText] = combinedData.split("/");
            const seats = seatsWithText?.match(/\d+/)?.[0]; // Extract number for seats
            return {
              bodyType: bodyType?.trim(), // Ensure no leading/trailing spaces
              seats,
            };
          }
          return {
            bodyType: "Not Available",
            seats: "Not Available",
          };
        }
        const bodyTypeSeatsSelector =
          "dt:has-text('Body/Seating') + .col-xs-7 span";
        const BodyType_Seats = (await page
          .locator(bodyTypeSeatsSelector)
          .isVisible())
          ? await page.locator(bodyTypeSeatsSelector).textContent()
          : "Not Available";

        const { bodyType, seats } = extractBodyTypeAndSeats(BodyType_Seats);

        const BodyType = getMainBodyType(bodyType);
        const Seats = seats;

        const ExteriorColor = (await page
          .locator(
            "dt:has-text('Exterior Colour') + .col-xs-7 span:nth-of-type(2)"
          )
          .isVisible())
          ? await page
              .locator(
                "dt:has-text('Exterior Colour') + .col-xs-7 span:nth-of-type(2)"
              )
              .textContent()
          : "Not Available";

        const InteriorColor = (await page
          .locator(
            "dt:has-text('Interior Colour') + .col-xs-7 span:nth-of-type(2)"
          )
          .isVisible())
          ? await page
              .locator(
                "dt:has-text('Interior Colour') + .col-xs-7 span:nth-of-type(2)"
              )
              .textContent()
          : "Not Available";

        const Transmission = (await page
          .locator("dt:has-text('Transmission') + .col-xs-7 span")
          .isVisible())
          ? await page
              .locator("dt:has-text('Transmission') + .col-xs-7 span")
              .textContent()
          : "Not Available";

        const Engine = (await page
          .locator("dt:has-text('Engine') + .col-xs-7 span")
          .isVisible())
          ? await page
              .locator("dt:has-text('Engine') + .col-xs-7 span")
              .textContent()
          : "Not Available";

        const DriveTrain = (await page
          .locator("dt:has-text('Drivetrain') + .col-xs-7 span")
          .isVisible())
          ? await page
              .locator("dt:has-text('Drivetrain') + .col-xs-7 span")
              .textContent()
          : "Not Available";

        const Stock_Number = (await page
          .locator("dt:has-text('Stock Number') + dd")
          .isVisible())
          ? await page.locator("dt:has-text('Stock Number') + dd").textContent()
          : "Not Available";

        const VIN = (await page
          .locator("dt:has-text('VIN') + .col-xs-7 span")
          .isVisible())
          ? await page
              .locator("dt:has-text('VIN') + .col-xs-7 span")
              .textContent()
          : "Not Available";

        const CoverImage =
          (await page.locator(".slide-current img").getAttribute("src")) ||
          "https://i.tribune.com.pk/media/images/1446862-carsilhouette-1498801914/1446862-carsilhouette-1498801914.jpg";

        const isViewGalleryButtonVisible = await page.isVisible(
          "div.mobile-toolbar__container"
        );
        let OtherCarImages = [];
        if (isViewGalleryButtonVisible) {
          try {
            await page.click("div.mobile-toolbar__container");
            await page.waitForTimeout(60000);
            if (await page.isVisible("img.pswp-thumbnail")) {
              await page.waitForSelector("img.pswp-thumbnail");
              OtherCarImages = await page.$$eval("img.pswp-thumbnail", (imgs) =>
                imgs.map((img) => img.src)
              );
            }
          } catch (error) {
            console.log("Error fetching additional images:", error);
          }
        } else {
          console.log(`View Gallery absent for car at: ${fullURL}`);
        }

        const carDetails = {
          car_url: carLink,
          carId: uuidv4(),
          Location,
          Make: Make ? Make.toLowerCase() : "Not Available",
          Model: Model ? Model.toLowerCase() : "Not Available",
          Year: Year || "Not Available",
          Trim,
          Price,
          BodyType: BodyType || "Not Available",
          ExteriorColor,
          InteriorColor,
          Transmission,
          Engine,
          DriveTrain,
          Seats,
          VIN,
          Stock_Number,
          CoverImage,
          OtherCarImages,
        };

        console.log(`Car_Number: #${carCounter}`);
        await sendCarToBubble(carDetails);
        console.log(carDetails);
      } catch (error) {
        console.error(`Error scraping car at ${carLink}:`, error.message);
        console.error(error.stack);
      }

      await page.waitForTimeout(5000);
    }
  }

  await browser.close();
};

module.exports = {
  startCrawler,
};

// startCrawler();
