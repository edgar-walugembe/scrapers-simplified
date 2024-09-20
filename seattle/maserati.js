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
        headless: headless,
      },
    },
    requestHandler: async ({ request, page, log, enqueueLinks }) => {
      console.log(`Processing: ${request.url}`);
      if (request.label === "DETAIL") {
        //when in the car details page
        log.debug(`Extracting data: ${request.url}`);

        const carName =
          (await page
            .locator("span.vehicle-title__make-model")
            .textContent()) || "Not Available";

        const Trim =
          (await page.locator("span.vehicle-title__trim").textContent()) ||
          "Not Available";
        function getCarMakeAndModel(carName, carTrim) {
          const [make, ...modelParts] = carName.split(" ");
          const model = modelParts.join(" ") + " " + carTrim;
          return { make, model };
        }

        const { make: Make, model: Model } = getCarMakeAndModel(carName, Trim);

        const Year =
          (await page.locator("span.vehicle-title__year").textContent()) ||
          "No Year Found";

        const Location = "Seattle";

        const Price =
          (await page
            .locator(
              ".beforeLeadSubmission .priceBlockResponsiveDesktop span.priceBlocItemPriceValue.priceStakText--bold"
            )
            .textContent()) || "Not Available";

        await page.click("#thumbnail--desktop--0 img.thumbnail__image");
        await page.waitForSelector(".gallery-thumbnails img");
        const otherCarImages = await page.$$eval(
          ".gallery-thumbnails img",
          (imgs) => imgs.map((img) => img.src)
        );

        const CoverImage = otherCarImages[0];

        const BodyType =
          (await page
            .locator(".info__item--body-style span.info__value")
            .textContent()) || "Not Available";

        const ExteriorColor =
          (
            await page
              .locator(".info__item--exterior-color span.info__value")
              .textContent()
          )
            ?.trim()
            .replace(/\n+/g, " ") || "Not Available";

        const InteriorColor =
          (
            await page
              .locator(".info__item--interior-color span.info__value")
              .textContent()
          )
            ?.trim()
            .replace(/\n+/g, " ") || "Not Available";

        const FuelType =
          (await page
            .locator(".info__item--fuel-type span.info__value")
            .textContent()) || "Not Available";

        const Transmission =
          (await page
            .locator(".info__item--transmission span.info__value")
            .textContent()) || "Not Available";

        const Stock_Number =
          (await page
            .locator(
              ".vehicle-identifiers__item--stock-number span.vehicle-identifiers__value"
            )
            .textContent()) || "Not Available";

        const VIN =
          (await page
            .locator(
              ".vehicle-identifiers__item--vin span.vehicle-identifiers__value"
            )
            .textContent()) || "Not Available";

        const carDetails = {
          car_url: request.url,
          car_id: uuidv4(),
          Location,
          Make,
          Model,
          Trim,
          BodyType,
          Year,
          Price,
          ExteriorColor,
          InteriorColor,
          Transmission,
          FuelType,
          CoverImage,
          otherCarImages,
          Stock_Number,
          VIN,
        };

        log.debug(`Saving data: ${request.url}`);
        console.log(carDetails);
      } else if (request.label === "CATEGORY") {
        //when in the car listing page
        log.debug(`Enqueueing pagination for: ${request.url}`);

        const carSelector = "a.hero-carousel__item--viewvehicle";
        await page.waitForSelector(carSelector);
        await enqueueLinks({
          selector: carSelector,
          label: "DETAIL",
        });
      } else {
        //when on the website's home page
        log.debug(`Enqueueing categories from page: ${request.url}`);

        const newCarLink = "a#\\32 _child_1";
        await enqueueLinks({
          selector: newCarLink,
          label: "CATEGORY",
        });
      }
    },
  });

  await crawler.run(["https://www.maseratiofseattle.com/"]);
}

module.exports = {
  startCrawler,
};
