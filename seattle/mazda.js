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

  await page.goto(`https://www.mazdaofseattle.com/search/new-mazda/?tp=new/`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const isCookiesVisible = await page.isVisible(
    "button[data-tid='banner-accept']"
  );
  if (isCookiesVisible) {
    await page.click("button[data-tid='banner-accept']");
    await page.waitForTimeout(3000);
  }

  //   const isMessageVisible = await page.isVisible("span.close.show");
  //   if (isMessageVisible) {
  //     await page.click("span.close.show");
  //     await page.waitForTimeout(3000);
  //   }

  //   const isChatVisible = await page.isVisible("span.close.pointer");
  //   if (isChatVisible) {
  //     await page.click("span.close.pointer");
  //     await page.waitForTimeout(3000);
  //   }

  let carCounter = 0;
  let hasNextPage = true;
  let pageNumber = 1;

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

    const productLocators = await page.locator("ul.dep_image_slider_ul_style");

    const carLinks = await productLocators.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-vdp_link"))
    );

    console.log(`Found ${carLinks.length} car links`);
    console.log(carLinks);

    const nextButtonSelector = "li.next > a";
    const nextButton = await page.$(nextButtonSelector);

    if (nextButton) {
      try {
        console.log(`Navigating to page ${pageNumber + 1}...`);
        const isNextButtonVisible = await page.isVisible(nextButtonSelector);
        const isDisabled = await page.$eval(
          nextButtonSelector,
          (btn) => btn.disabled
        );
        if (!isNextButtonVisible || isDisabled) {
          console.log("No more pages to navigate.");
          hasNextPage = false;
        } else {
          await Promise.all([
            page.click(nextButtonSelector),
            page.waitForURL(/search\.html/, { waitUntil: "domcontentloaded" }),
          ]);
          pageNumber++;
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
}
// startCrawler();

module.exports = {
  startCrawler,
};
