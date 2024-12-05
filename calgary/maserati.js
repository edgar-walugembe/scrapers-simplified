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

const startCrawler = async () => {
  console.log(`maserati:calgary started`);

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

  await page.goto(`https://www.maseratiofalberta.com/`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const newCarSelector = await page.isVisible(".menu-item-2308 > a");
  if (newCarSelector) {
    console.log("New car link selected...");
    await page.click(".menu-item-2308 > a");
  }
  await page.waitForTimeout(120000);

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

      const Location = "Calgary";

      const price = (await page.isVisible("span#final-price"))
        ? await page.locator("span#final-price").textContent()
        : "Not Available";
      const Price = `$${price}`;

      const CoverImage =
        (await page.locator("img[itemprop='image']").getAttribute("src")) ||
        "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

      await page.waitForSelector(".thumb img");
      const OtherCarImages = await page.$$eval(".thumb img", (imgs) =>
        imgs.map((img) => img.src)
      );

      let BodyType = (await page.isVisible("td[itemprop='bodyType']"))
        ? await page.locator("td[itemprop='bodyType']").textContent()
        : "Not Available";

      BodyType = getMainBodyType(BodyType);

      const Engine = (await page.isVisible("td[itemprop='vehicleEngine']"))
        ? await page.locator("td[itemprop='vehicleEngine']").textContent()
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

      const DriveTrain = (await page.isVisible(
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
        carId: uuidv4(),
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
        DriveTrain,
        FuelType,
        CoverImage,
        OtherCarImages,
        Engine,
        Stock_Number,
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

  await browser.close();
};

module.exports = {
  startCrawler,
};
// startCrawler();
