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
      "trucks",
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
      "sportback",
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
        Authorization: `Bearer 6af869f6680291881c0d8fbcfa686ff3`,
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
  console.log(`coastalfordvancouver:vancouver started`);

  const userAgent = randomUseragent.getRandom();

  const browser = await playwright.chromium.launch({
    headless: true,
    proxy: {
      server: "p.webshare.io:80",
      username: "uiswvtpz-US-rotate",
      password: "u7ughcrj1rmx",
    },
  });

  console.log(`browser opened`);
  const context = await browser.newContext({ userAgent: userAgent });
  const page = await context.newPage({ bypassCSP: true });
  await page.setDefaultTimeout(30000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(
    `https://www.coastalfordvancouver.com/new/inventory/search.html`,
    {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    }
  );

  let carCounter = 0;

  //   let pageNumber = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    let previousHeight = await page.evaluate("document.body.scrollHeight");
    let reachedEnd = false;

    while (!reachedEnd) {
      await autoScroll(page);
      await page.waitForTimeout(60000);

      let newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) {
        reachedEnd = true;
      }
      previousHeight = newHeight;

      const productSelector = "div.carImage a";
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
          function extractCarDetails(url) {
            const regex = /\/(\d{4})-([\w-]+)-([\w-]+)-id/;
            const match = url.match(regex);

            if (match) {
              let [_, year, make, model] = match;

              make = make.replace(/-/g, " ");
              model = model.replace(/-/g, " ");

              return {
                year,
                make,
                model,
              };
            } else {
              throw new Error("URL does not match the expected pattern.");
            }
          }
          const { year, make, model } = extractCarDetails(carLink);

          const Year = year || "Year Not Found";
          const Make = make || "Make Not Found";
          const Model = model || "Model Not Found";

          const Location = "Vancouver";

          const carDetails = {
            car_url: carLink,
            carId: uuidv4(),
            Location,
            Make: Make.toLowerCase(),
            Model: Model.toLowerCase(),
            Trim,
            BodyType,
            FuelType,
            Year,
            Price,
            ExteriorColor,
            InteriorColor,
            Transmission,
            Engine,
            CoverImage,
            OtherCarImages,
            Stock_Number,
            VIN,
          };

          console.log(`Car_Number: #${carCounter}`);
          // await sendCarToBubble(carDetails);
          console.log(carDetails);
        } catch (error) {
          console.error(`Error scraping car at ${carLink}:`, error.message);
          console.error(error.stack);
        }
      }
      await page.waitForTimeout(5000);
    }
  }

  await browser.close();
};

// module.exports = {
//   startCrawler,
// };

startCrawler();
