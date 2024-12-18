const playwright = require("playwright");
const randomUseragent = require("random-useragent");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

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
  console.log(`mazda:vancouver started`);
  const userAgent = randomUseragent.getRandom();

  const browser = await playwright.chromium.launch({
    headless: true,
    proxy: {
      server: "204.44.109.65:5586",
      username: "gwiheggj",
      password: "irq9m6nictiy",
    },
  });

  const context = await browser.newContext({ userAgent: userAgent });
  const page = await context.newPage({ bypassCSP: true });
  await page.setDefaultTimeout(30000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(`https://www.alanwebbmazda.com/searchnew.aspx?pn=96`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const isChatVisible = await page.isVisible("a.cn-b13-btn.cn-b13-text");
  if (isChatVisible) {
    await page.click("a.cn-b13-btn.cn-b13-text");
    await page.waitForTimeout(3000);
  }

  let carCounter = 0;

  // let pageNumber = 1;
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

    const productSelector =
      "div.hero-carousel__item a.hero-carousel__item--viewvehicle";
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
          const regex = /(\d{4})-[+]*-(Mazda[\w+]+)-([\d\S]+)-([A-Z0-9]+)$/;
          const match = url.match(regex);

          if (match) {
            const year = match[1];
            let model = match[2].replace(/\+/g, " ");
            const bodyTypes = [
              "Hatchback",
              "Sedan",
              "SUV",
              "Coupe",
              "Truck",
              "Van",
              "Convertible",
              "Wagon",
              "Sport Utility",
            ];

            bodyTypes.forEach((type) => {
              const regexType = new RegExp(`\\b${type}\\b`, "i");
              model = model.replace(regexType, "").trim();
            });

            const trim = match[3].replace(/\+/g, " ");

            return {
              year,
              model,
              trim,
            };
          } else {
            return null;
          }
        }

        const { year, model, trim } = extractCarDetails(carLink);
        const Year = year;
        const Model = model;
        const Trim = trim;

        const Make = "Mazda";
        const Location = "Vancouver";

        function getBodyTypeFromUrl(url) {
          const bodyTypes = {
            sedan: [
              "sedan",
              "compact sedan",
              "subcompact sedan",
              "midsize sedan",
              "full-size sedan",
              "executive sedan",
              "luxury sedan",
              "sports sedan",
            ],
            hatchback: [
              "hatchback",
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
              "sports-utility",
              "sport utility",
            ],
            coupe: [
              "coupe",
              "sports coupe",
              "grand tourer",
              "hardtop coupe",
              "luxury coupe",
              "performance coupe",
              "sport",
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
            const lowerCaseUrl = url.toLowerCase();
            for (let mainType in bodyTypes) {
              for (let type of bodyTypes[mainType]) {
                if (lowerCaseUrl.includes(type.toLowerCase())) {
                  return mainType;
                }
              }
            }

            throw new Error("No body type found in the URL");
          } catch (error) {
            return "Not Available";
          }
        }
        const BodyType = getBodyTypeFromUrl(carLink);

        const Price = (await page.isVisible(
          ".beforeLeadSubmission .priceBlockResponsiveDesktop .featuredPrice span.vehiclePricingHighlightAmount"
        ))
          ? await page
              .locator(
                ".beforeLeadSubmission .priceBlockResponsiveDesktop .featuredPrice span.vehiclePricingHighlightAmount"
              )
              .textContent()
          : "Not Available";

        const ExteriorColor = (await page
          .locator(".info__item--exterior-color span.info__value")
          .isVisible())
          ? (
              await page
                .locator(".info__item--exterior-color span.info__value")
                .textContent()
            ).trim()
          : "Not Available";

        const InteriorColor = (await page
          .locator(".info__item--interior-color span.info__value")
          .isVisible())
          ? (
              await page
                .locator(".info__item--interior-color span.info__value")
                .textContent()
            ).trim()
          : "Not Available";

        const Transmission = (await page
          .locator(".info__item--transmission span.info__value")
          .isVisible())
          ? await page
              .locator(".info__item--transmission span.info__value")
              .textContent()
          : "Not Available";

        const Engine = (await page
          .locator(".info__item--engine span.info__value")
          .isVisible())
          ? await page
              .locator(".info__item--engine span.info__value")
              .textContent()
          : "Not Available";

        const FuelType = (await page
          .locator(".info__item--fuel-type span.info__value")
          .isVisible())
          ? await page
              .locator(".info__item--fuel-type span.info__value")
              .textContent()
          : "Not Available";

        const Stock_Number = (await page
          .locator(
            ".vehicle-identifiers__item--stock-number span.vehicle-identifiers__value"
          )
          .isVisible())
          ? await page
              .locator(
                ".vehicle-identifiers__item--stock-number span.vehicle-identifiers__value"
              )
              .textContent()
          : "Not Available";

        const VIN = (await page
          .locator(
            ".vehicle-identifiers__item--vin span.vehicle-identifiers__value"
          )
          .isVisible())
          ? await page
              .locator(
                ".vehicle-identifiers__item--vin span.vehicle-identifiers__value"
              )
              .textContent()
          : "Not Available";

        await page.click(
          "a#thumbnail--desktop--0.thumbnail.thumbnail--desktop"
        );
        await page.waitForSelector(".gallery-thumbnails img");
        const OtherCarImages = await page.$$eval(
          ".gallery-thumbnails img",
          (imgs) => imgs.map((img) => img.src)
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
          Trim,
          BodyType,
          Year,
          Price,
          ExteriorColor,
          InteriorColor,
          Transmission,
          Engine,
          FuelType,
          CoverImage,
          OtherCarImages,
          Stock_Number,
          VIN,
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

// const productSelector = "hero-carousel__item--viewvehicle";
// const price = "vehiclePricingHighlightAmount";
// const imageClick = "expand-btn";
