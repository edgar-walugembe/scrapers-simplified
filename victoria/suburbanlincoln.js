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
    console.message(error.message);
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
    headless: true,
    proxy: {
      server: "204.44.109.65:5586",
      username: "gwiheggj",
      password: "irq9m6nictiy",
    },
  });

  const page = await browser.newPage();

  await page.goto(`https://www.suburbanlincoln.ca/new/inventory/search.html`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  let carCounter = 0;

  let pageNumber = 1;
  let hasNextPage = true;

  while (hasNextPage) {
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

    const productSelector = "div.carImage > a";
    const carLinks = await page.$$eval(productSelector, (links) =>
      links.map((link) => link.href)
    );

    console.log(`Page ${pageNumber}: Found ${carLinks.length} car links`);
    for (const carLink of carLinks) {
      carCounter++;

      await page.goto(carLink, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      try {
        function extractCarDetails(url) {
          const urlPart = url.split("/").pop();
          const urlSegments = urlPart.split("-");

          const year = urlSegments[0];
          const make = urlSegments[1];
          const model = urlSegments[2].replace(/_/g, " ");
          return { year, make, model };
        }

        const { year, make, model } = extractCarDetails(carLink) || {};

        const Year = year || "Year Not Found";
        const Make = make || "Make Not Found";
        const Model = model || "Model Not Found";

        const Location = "Victoria";

        let Price = (await page.isVisible("span#specsPrice"))
          ? await page.locator("span#specsPrice").textContent()
          : "Not Available";
        Price = Price.includes("Price:")
          ? Price.replace("Price:", "").trim()
          : Price;

        let Trim = (await page.isVisible("span#specsVersion"))
          ? await page.locator("span#specsVersion").textContent()
          : "Not Available";
        Trim = Trim.includes("Trim Level:")
          ? Trim.replace("Trim Level:", "").trim()
          : Trim;

        let BodyType = (await page.isVisible("span#specsBodyType"))
          ? await page.locator("span#specsBodyType").textContent()
          : "Not Available";

        BodyType = BodyType.includes("Category:")
          ? BodyType.replace("Category:", "").trim()
          : BodyType;
        BodyType = getMainBodyType(BodyType);

        let ExteriorColor = (await page.isVisible("span#specsExtColor"))
          ? await page.locator("span#specsExtColor").textContent()
          : "Not Available";
        ExteriorColor = ExteriorColor.includes("Exterior Color:")
          ? ExteriorColor.replace("Exterior Color:", "").trim()
          : ExteriorColor;

        let Transmission = (await page.isVisible("span#specsTransmission"))
          ? await page.locator("span#specsTransmission").textContent()
          : "Not Available";
        Transmission = Transmission.includes("Transmission:")
          ? Transmission.replace("Transmission:", "").trim()
          : Transmission;

        let DriveTrain = (await page.isVisible("span#specsDriveTrain"))
          ? await page.locator("span#specsDriveTrain").textContent()
          : "Not Available";
        DriveTrain = DriveTrain.includes("Drive train:")
          ? DriveTrain.replace("Drive train:", "").trim()
          : DriveTrain;

        let Mileage = (await page.isVisible("span#specsKM"))
          ? await page.locator("span#specsKM").textContent()
          : "Not Available";
        Mileage = Mileage.includes("Kilometers:")
          ? Mileage.replace("Kilometers:", "").trim()
          : Mileage;

        let Engine = (await page.isVisible(".divSpan7 li:nth-of-type(3)"))
          ? await page.locator(".divSpan7 li:nth-of-type(3)").textContent()
          : "Not Available";
        Engine = Engine.includes("Engine:")
          ? Engine.replace("Engine:", "").trim()
          : Engine;

        let Stock_Number = (await page.isVisible("span#specsNoStock"))
          ? await page.locator("span#specsNoStock").textContent()
          : "Not Available";
        Stock_Number = Stock_Number.includes("Stock #:")
          ? Stock_Number.replace("Stock #:", "").trim()
          : Stock_Number;

        let VIN;
        if (await page.isVisible(".divSpan5 li:nth-of-type(7)")) {
          VIN = await page.locator(".divSpan5 li:nth-of-type(7)").textContent();
        } else if (await page.isVisible("span#specsVin")) {
          VIN = await page.locator("span#specsVin").textContent();
        } else {
          VIN = "Not Available";
        }
        VIN = VIN.includes("VIN:") ? VIN.replace("VIN:", "").trim() : VIN;

        await page.waitForSelector("img.image");
        const OtherCarImages = await page.$$eval("img.image", (imgs) =>
          imgs.map((img) => img.src)
        );

        const CoverImage =
          OtherCarImages[0] ||
          "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

        const carDetails = {
          car_url: carLink,
          carId: uuidv4(),
          Location,
          Make: Make.toLowerCase(),
          Model: Model.toLowerCase(),
          Trim: Trim.toLowerCase(),
          BodyType: BodyType.toLowerCase(),
          Year,
          Mileage,
          Price,
          ExteriorColor,
          Transmission,
          DriveTrain,
          CoverImage,
          OtherCarImages,
          Engine,
          Stock_Number,
          VIN,
        };
        console.log(`Car_Number: #${carCounter}`);
        await sendCarToBubble(carDetails);
        console.log(carDetails);
      } catch (error) {
        console.error(`Error scraping car at ${carLink}:`, error);
      }
      await page.waitForTimeout(5000);
    }

    const nextButtonSelector = "li[title='up']";
    const nextButton = await page.$(nextButtonSelector);

    if (nextButton) {
      try {
        const isNextButtonVisible = await page.isVisible(nextButtonSelector);
        if (!isNextButtonVisible) {
          console.log("Next button is not visible, stopping pagination.");
          hasNextPage = false;
        } else {
          const isDisabled = await page.$eval(
            nextButtonSelector,
            (btn) => btn.disabled
          );
          if (isDisabled) {
            console.log("Next button is disabled, stopping pagination.");
            hasNextPage = false;
          } else {
            console.log(`Navigating to page ${pageNumber + 1}...`);

            // Retry logic for navigation
            let retryCount = 0;
            let maxRetries = 3;
            let pageLoaded = false;

            while (retryCount < maxRetries && !pageLoaded) {
              try {
                await Promise.all([
                  page.click(nextButtonSelector),
                  page.waitForURL(/search\.html/, {
                    waitUntil: "domcontentloaded",
                    timeout: 60000,
                  }),
                ]);
                pageLoaded = true;
                pageNumber++;
              } catch (error) {
                retryCount++;
                console.log(
                  `Error navigating to page ${pageNumber + 1}: ${
                    error.message
                  }. Retrying (${retryCount}/${maxRetries})...`
                );
                if (retryCount >= maxRetries) {
                  console.error(
                    `Failed to navigate to page ${
                      pageNumber + 1
                    } after ${maxRetries} retries.`
                  );
                  hasNextPage = false;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error navigating to page ${pageNumber + 1}:`, error);
        hasNextPage = false;
      }
    } else {
      console.log("No more pages to navigate.");
      hasNextPage = false;
    }
  }

  await browser.close();
}

module.exports = {
  startCrawler,
};

// startCrawler();
