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
  console.log(`mazda:victoria started`);
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

  await page.goto(`https://www.mazdavictoria.com/new/inventory/search.html`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  let carCounter = 0;

  //   let pageNumber = 1;
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

    const baseURL = "https://www.mazdavictoria.com/";
    const productLocators = page.locator("div.carImage.empty-banner a");
    const carLinks = await productLocators.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href"))
    );

    const fullURLs = carLinks.map((carLink) =>
      carLink.startsWith("http") ? carLink : `${baseURL}${carLink}`
    );

    console.log(`Found ${fullURLs.length} car links`);

    for (const fullURL of fullURLs) {
      carCounter++;

      await page.goto(fullURL, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await page.waitForURL(fullURL, { timeout: 120000 });

      try {
        function extractCarDetails(url) {
          const regex = /\/inventory\/(\d{4})-([^-]+)-([^-]+)-id/;
          const match = url.match(regex);

          if (match) {
            const year = match[1];
            const make = match[2].trim();
            let model = match[3].replace(/[_]/g, " ").trim();

            const bodyTypes = ["Sport", "Hatchback", "Sedan"];
            const modelWords = model.split(" ");
            if (bodyTypes.includes(modelWords[modelWords.length - 1])) {
              modelWords.pop();
            }
            model = modelWords.join(" ");

            if (!model.toLowerCase().includes("mazda")) {
              model = `${make} ${model}`.trim();
            }

            return { year, make, model };
          } else {
            return { error: "URL format not recognized" };
          }
        }

        const { year, make, model } = extractCarDetails(fullURL) || {};

        const Year = year || "Year Not Found";
        const Make = make || "Make Not Found";
        const Model = model || "Model Not Found";

        function extractTrim(text) {
          const regex = /^(\d{4})\s+([\w\s-]+)$/;
          const match = text.match(regex);

          if (match) {
            return match[2].trim();
          }
          return "Not Available";
        }

        const trimExtract = (await page.isVisible("div.makeModelYear"))
          ? await page.locator("div.makeModelYear").textContent()
          : "Not Available";
        const Trim = extractTrim(trimExtract);

        const Location = "Victoria";

        let BodyType = (await page.isVisible("span#specsBodyType"))
          ? await page.locator("span#specsBodyType").textContent()
          : "Not Available";

        BodyType = BodyType.includes("Category:")
          ? BodyType.replace("Category:", "").trim()
          : BodyType;
        BodyType = getMainBodyType(BodyType);

        let Price = (await page.isVisible("span#specsPrice"))
          ? await page.locator("span#specsPrice").textContent()
          : "Not Available";
        Price = Price.includes("Price:")
          ? Price.replace("Price:", "").trim()
          : Price;
        if (Price !== "Not Available" && !Price.startsWith("$")) {
          Price = `$${Price}`;
        }

        let Mileage = (await page.isVisible("span#specsKM"))
          ? await page.locator("span#specsKM").textContent()
          : "Not Available";
        Mileage = Mileage.includes("Kilometers:")
          ? Mileage.replace("Kilometers:", "").trim()
          : Mileage;

        let ExteriorColor = (await page.isVisible("span#specsExtColor"))
          ? await page.locator("span#specsExtColor").textContent()
          : "Not Available";
        ExteriorColor = ExteriorColor.includes("Exterior Color:")
          ? ExteriorColor.replace("Exterior Color:", "").trim()
          : ExteriorColor;

        let InteriorColor = (await page.isVisible("span#specsIntColor"))
          ? await page.locator("span#specsIntColor").textContent()
          : "Not Available";
        InteriorColor = InteriorColor.includes("Interior Color:")
          ? InteriorColor.replace("Interior Color:", "").trim()
          : InteriorColor;

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

        let Engine = (await page.isVisible("span#specsEngine"))
          ? await page.locator("span#specsEngine").textContent()
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

        let VIN = (await page.isVisible("span#specsVin"))
          ? await page.locator("span#specsVin").textContent()
          : "Not Available";
        VIN = VIN.includes("VIN:") ? VIN.replace("VIN:", "").trim() : VIN;

        await page.waitForSelector("img.image");
        const OtherCarImages = await page.$$eval("img.image", (imgs) =>
          imgs.map((img) => img.src)
        );

        const CoverImage =
          OtherCarImages[0] ||
          "https://i.tribune.com.pk/media/images/1446862-carsilhouette-1498801914/1446862-carsilhouette-1498801914.jpg";

        const carDetails = {
          car_url: fullURL,
          carId: uuidv4(),
          Location,
          Make: Make.toLowerCase(),
          Model: Model.toLowerCase(),
          Year,
          Price,
          Trim,
          Mileage,
          BodyType,
          ExteriorColor,
          InteriorColor,
          Transmission,
          Engine,
          DriveTrain,
          Stock_Number,
          VIN,
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

//   const nextButtonSelector = "li.next a.thm-light_text_color";
//   const nextButton = await page.$(nextButtonSelector);

//   if (nextButton) {
//     try {
//       console.log(`Navigating to page ${pageNumber + 1}...`);
//       const isNextButtonVisible = await page.isVisible(nextButtonSelector);
//       const isDisabled = await page.$eval(
//         nextButtonSelector,
//         (btn) => btn.disabled
//       );
//       if (!isNextButtonVisible || isDisabled) {
//         console.log("No more pages to navigate.");
//         hasNextPage = false;
//       } else {
//         await Promise.all([
//           page.click(nextButtonSelector),
//           page.waitForURL(/search\.html/, { waitUntil: "domcontentloaded" }),
//         ]);
//         pageNumber++;
//       }
//     } catch (error) {
//       console.error(`Error navigating to page ${pageNumber + 1}:`, error);
//       hasNextPage = false;
//     }
//   } else {
//     console.log("No more pages to navigate.");
//     hasNextPage = false;
//   }
