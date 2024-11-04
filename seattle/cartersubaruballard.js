const playwright = require("playwright");
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
    console.error("Error adding car:", error.response?.data || error.message);
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
      server: "154.16.146.42:80",
    },
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

      const DriveTrain = (await page.isVisible(
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
      let OtherCarImages = [];
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
            OtherCarImages = await page.$$eval(
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
        OtherCarImages[0] ||
        "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

      const carDetails = {
        car_url: carLink,
        carId: uuidv4(),
        Location,
        Make,
        Model,
        Trim: Trim.toLowerCase(),
        Mileage,
        Year: Year,
        Price,
        ExteriorColor,
        InteriorColor,
        DriveTrain,
        CoverImage,
        OtherCarImages,
        Stock_Number,
        VIN,
        Doors,
        Seats,
      };

      console.log(`Car_Number: #${carCounter}`);
      await sendCarToBubble(carDetails);
      console.log(carDetails);
    } catch (error) {
      console.error(`Error scraping car at ${carLink}:`, error);
    }

    await page.waitForTimeout(5000);
  }

  await browser.close();
}

module.exports = {
  startCrawler,
};

// startCrawler();
