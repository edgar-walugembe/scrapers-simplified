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

const startCrawler = async () => {
  console.log(`maserati:seattle started`);
  const userAgent = randomUseragent.getRandom();

  const browser = await playwright.chromium.launch({
    headless: true,
    proxy: {
      server: "p.webshare.io:80",
      username: "uiswvtpz-US-rotate",
      password: "u7ughcrj1rmx",
    },
  });

  const context = await browser.newContext({ userAgent: userAgent });
  const page = await context.newPage({ bypassCSP: true });
  await page.setDefaultTimeout(30000);
  await page.setViewportSize({ width: 1920, height: 1080 });

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
      const OtherCarImages = await page.$$eval(
        ".gallery-thumbnails img",
        (imgs) => imgs.map((img) => img.src)
      );

      const CoverImage =
        OtherCarImages[0] ||
        "https://i.tribune.com.pk/media/images/1446862-carsilhouette-1498801914/1446862-carsilhouette-1498801914.jpg";

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

  await browser.close();
};

module.exports = {
  startCrawler,
};

// startCrawler();
