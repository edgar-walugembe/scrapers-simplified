// import { PlaywrightCrawler, log } from "crawlee";
// import { v4 as uuidv4 } from "uuid";
// import dotenv from "dotenv";
const { PlaywrightCrawler, log } = require("crawlee");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");

log.setLevel(log.LEVELS.DEBUG);
log.debug("Setting up crawler.");
dotenv.config();

async function startCrawler() {
  const crawler = new PlaywrightCrawler({
    launchContext: {
      launchOptions: {
        headless: false,
      },
    },
    requestHandler: async ({ request, page, log, enqueueLinks }) => {
      console.log(`Processing: ${request.url}`);
      if (request.label === "DETAIL") {
        //when in the car details page
        log.debug(`Extracting data: ${request.url}`);

        const urlPath = new URL(request.url).pathname;
        const carRegex = /\/vehicle\/(\d{4})-(\w+)-(\w+)-/;
        const carMatch = urlPath.match(carRegex);

        const Make = carMatch ? carMatch[2] : "Make Not Found";
        const Model = carMatch ? carMatch[3] : "Model Not Found";
        const Year = carMatch ? carMatch[1] : "Year Not Found";

        const Location = "Vancouver";

        const price =
          (await page.locator("span#final-price").textContent()) ||
          "Not Available";
        const Price = `$${price}`;

        const CoverImage =
          (await page.locator("img[itemprop='image']").getAttribute("src")) ||
          "Not Available";

        await page.waitForSelector(".thumb img");
        const otherCarImages = await page.$$eval(".thumb img", (imgs) =>
          imgs.map((img) => img.src)
        );

        const BodyType =
          (await page.locator("td[itemprop='bodyType']").textContent()) ||
          "Not Available";

        const Engine =
          (await page.locator("td[itemprop='vehicleEngine']").textContent()) ||
          "Not Available";

        const Mileage =
          (await page
            .locator("td[itemprop='mileageFromOdometer']")
            .textContent()) || "Not Available";

        const Trim =
          (await page.locator("[itemprop='model'] span").textContent()) ||
          "Not Available";

        const ExteriorColor =
          (await page.locator("td[itemprop='color']").textContent()) ||
          "Not Available";

        const InteriorColor =
          (await page
            .locator("td[itemprop='vehicleInteriorColor']")
            .textContent()) || "Not Available";

        const Drivetrain =
          (await page
            .locator("div:nth-of-type(3) tr:nth-of-type(3) td.td-odd")
            .textContent()) || "Not Available";

        const FuelType =
          (await page.locator("td[itemprop='fuelType']").textContent()) ||
          "Not Available";

        const Transmission =
          (await page
            .locator("td[itemprop='vehicleTransmission']")
            .textContent()) || "Not Available";

        const Stock_Number =
          (await page.locator("td[itemprop='sku']").textContent()) ||
          "Not Available";

        const carDetails = {
          car_url: request.url,
          car_id: uuidv4(),
          Location,
          Make,
          Model,
          Trim,
          Mileage,
          BodyType,
          Year,
          Price,
          ExteriorColor,
          InteriorColor,
          Transmission,
          Drivetrain,
          FuelType,
          CoverImage,
          otherCarImages,
          Engine,
          Stock_Number,
        };

        log.debug(`Saving data: ${request.url}`);
        console.log(carDetails);
      } else if (request.label === "CATEGORY") {
        //when in the car listing page
        log.debug(`Enqueueing pagination for: ${request.url}`);

        const carSelector = ".item.active > a";
        await page.waitForSelector(carSelector);
        await enqueueLinks({
          selector: carSelector,
          label: "DETAIL",
        });

        let previousHeight;
        let newHeight = await page.evaluate(() => document.body.scrollHeight);
        while (previousHeight !== newHeight) {
          previousHeight = newHeight;
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
          await page.waitForTimeout(3000);
          newHeight = await page.evaluate(() => document.body.scrollHeight);

          await enqueueLinks({
            selector: carSelector,
            label: "DETAIL",
          });
        }
      } else {
        //when on the website's home page
        log.debug(`Enqueueing categories from page: ${request.url}`);

        const newCarLink = ".menu-item-5260 > a";
        await page.waitForSelector(newCarLink);
        await enqueueLinks({
          selector: newCarLink,
          label: "CATEGORY",
        });
      }
    },
  });

  await crawler.run(["https://www.maserativancouver.com/"]);
}

module.exports = {
  startCrawler,
};
