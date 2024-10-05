const playwright = require("playwright");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

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

// function to split cars array into smaller chunks
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function sendScrapedCarsToAPI(cars) {
  const chunkSize = 10;
  const carChunks = chunkArray(cars, chunkSize);

  for (const chunk of carChunks) {
    try {
      const response = await axios.post(
        "https://scraper-db-api.onrender.com/cars/new-cars",
        {
          cars: chunk,
        }
      );
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

  await page.goto(
    `https://www.autotrader.ca/cars/ab/calgary/?rcp=15&rcs=0&srt=35&prx=100&prv=Alberta&loc=calgary&hprc=True&wcp=True&sts=New&showcpo=1&inMarket=advancedSearch`,
    {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    }
  );

  const isCookiesPopUpVisible = await page.isVisible(".close-button");
  if (isCookiesPopUpVisible) {
    await page.click(".close-button");
    await page.waitForTimeout(3000);
  }

  await page.waitForSelector("select#pageSize");
  await page.selectOption("select#pageSize", "100");
  await page.waitForTimeout(10000);

  let hasNextPage = true;
  let carCounter = 0;

  while (hasNextPage) {
    // Handle pop-up if it appears
    const isPopupVisible = await page.isVisible(".ng-binding");
    if (isPopupVisible) {
      console.log("Pop-up detected. Cancelling...");
      await page.click(".ng-binding");
      await page.waitForTimeout(3000);
    }

    // Get all car listing links on the current page
    const productSelector = ".dealer-split-wrapper > a";
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

      // Scrape Car Details.
      try {
        const urlParts = carLink.split("/");
        const Make = urlParts[4] || "Not Available";
        let Model = urlParts[5] || "Not Available";
        Model = decodeURIComponent(Model);

        const carNameWithTrim = (await page.isVisible("h1.hero-title"))
          ? await page.locator("h1.hero-title").textContent()
          : "Not Available";

        const Trim = (await page.isVisible("span#spec-value-2"))
          ? await page.locator("span#spec-value-2").textContent()
          : "Not Available";

        function getCarName(carNameWithTrim, Trim) {
          const trimIndex = carNameWithTrim.indexOf(Trim);
          if (trimIndex !== -1) {
            return carNameWithTrim.substring(0, trimIndex).trim();
          } else {
            return carNameWithTrim;
          }
        }
        const carName = getCarName(carNameWithTrim, Trim);

        const pattern = /\b\d{4}\b/;
        const match = carName.match(pattern);
        const Year = match ? match[0] : "No Year Found";

        const Location = "Calgary";

        const CoverImage =
          (await page.locator("img#mainPhoto.loaded").getAttribute("src")) ||
          "Not Available";

        await page.click("img#mainPhoto.loaded");
        await page.waitForSelector(".gallery-thumbnail img");
        const otherCarImages = await page.$$eval(
          ".gallery-thumbnail img",
          (imgs) => imgs.map((img) => img.src)
        );

        const Status = (await page.isVisible("span#spec-value-1"))
          ? await page.locator("span#spec-value-1").textContent()
          : "Not Available";

        let BodyType = (await page.isVisible("span#spec-value-3"))
          ? await page.locator("span#spec-value-3").textContent()
          : "Not Available";

        BodyType = getMainBodyType(BodyType);

        const Engine = (await page.isVisible("span#spec-value-4"))
          ? await page.locator("span#spec-value-4").textContent()
          : "Not Available";

        const Drivetrain = (await page.isVisible("span#spec-value-7"))
          ? await page.locator("span#spec-value-7").textContent()
          : "Not Available";

        const price = (await page.isVisible(".hero-price"))
          ? await page.locator(".hero-price").textContent()
          : "Not Available";
        const Price = `$${price}`;

        const Mileage = (await page.isVisible("span#spec-value-0"))
          ? await page.locator("span#spec-value-0").textContent()
          : "Not Available";

        const Doors = (await page.isVisible("span#spec-value-11"))
          ? await page.locator("span#spec-value-11").textContent()
          : "Not Available";

        //confirm whether received text is not a number
        const isTextOnly = (text) => /^[A-Za-z\s]+$/.test(text.trim());

        const validExteriorColor = (await page.isVisible("span#spec-value-9"))
          ? await page.locator("span#spec-value-9").textContent()
          : "Not Available";
        const ExteriorColor = isTextOnly(validExteriorColor)
          ? validExteriorColor
          : "Not Available";

        const validInteriorColor = (await page.isVisible("span#spec-value-10"))
          ? await page.locator("span#spec-value-10").textContent()
          : "Not Available";
        const InteriorColor = isTextOnly(validInteriorColor)
          ? validInteriorColor
          : "Not Available";

        const validFuelType = (await page.isVisible("span#spec-value-12"))
          ? await page.locator("span#spec-value-12").textContent()
          : "Not Available";
        const FuelType = isTextOnly(validFuelType)
          ? validFuelType
          : "Not Available";

        const Transmission = (await page.isVisible("span#spec-value-6"))
          ? await page.locator("span#spec-value-6").textContent()
          : "Not Available";

        const Stock_Number = (await page.isVisible("span#spec-value-8"))
          ? await page.locator("span#spec-value-8").textContent()
          : "Not Available";

        const Description = (await page.isVisible(
          "div#vdp-collapsible-short-text"
        ))
          ? await page.locator("div#vdp-collapsible-short-text").textContent()
          : "Not Available";

        //Dealer info will be available after database is updated
        const Dealer = (await page.isVisible(".dealerInfo-name"))
          ? await page.locator(".dealerInfo-name").textContent()
          : "Not Available";

        const Dealer_Phone = (await page.isVisible(".dealerInfo-phone"))
          ? await page.locator(".dealerInfo-phone").textContent()
          : "Not Available";

        const carDealer = {
          name: Dealer,
          number: Dealer_Phone,
        };

        const carDetails = {
          car_url: carLink,
          car_id: uuidv4(),
          Location,
          Make: Make.toLowerCase(),
          Model: Model.toLowerCase(),
          Trim,
          Mileage,
          BodyType: BodyType.toLowerCase(),
          Year,
          Status,
          Price,
          ExteriorColor,
          InteriorColor,
          Transmission,
          CoverImage,
          otherCarImages,
          Engine,
          Drivetrain,
          FuelType,
          Stock_Number,
          Doors,
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

    const nextButton = await page.$("a.last-page-link");
    if (nextButton) {
      console.log("Navigating to the next page...");
      await nextButton.click();
      await page.waitForSelector(".dealer-split-wrapper");
    } else {
      console.log("No more pages to navigate.");
      hasNextPage = false;
    }
  }

  await browser.close();
}

startCrawler();

// module.exports = {
//   startCrawler,
// };
