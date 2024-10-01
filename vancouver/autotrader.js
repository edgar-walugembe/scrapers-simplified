const playwright = require("playwright");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
dotenv.config();

async function startCrawler() {
  const crawler = new PlaywrightCrawler({
    launchContext: {
      launchOptions: { headless: true },
    },
    requestHandler: async ({ request, page, log, enqueueLinks }) => {
      console.log(`Processing: ${request.url}`);
      if (request.label === "DETAIL") {
        //when in the car details page
        console.log(`Extracting data: ${request.url}`);

        const urlParts = request.url.split("/");
        const Make = urlParts[4] || "Not Available";

        const carNameWithTrim =
          (await page.locator("h1.hero-title").textContent()) ||
          "Not Available";

        const Trim =
          (await page.locator("span#spec-value-2").textContent()) ||
          "Not Available";

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

        function getCarModel(carNameWithTrim, Trim) {
          const carNameNoYear = carNameWithTrim.replace(/\b\d{4}\b/, "").trim();

          const words = carNameNoYear.split(" ");

          const brand = words[0];
          const model = words.slice(1, words.indexOf(Trim)).join(" ");

          return model || "Model Not Found";
        }
        const Model = getCarModel(carNameWithTrim, Trim);

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

        const Status =
          (await page.locator("span#spec-value-1").textContent()) ||
          "Not Available";

        const BodyType =
          (await page.locator("span#spec-value-3").textContent()) ||
          "Not Available";

        const Engine =
          (await page.locator("span#spec-value-4").textContent()) ||
          "Not Available";

        const Drivetrain =
          (await page.locator("span#spec-value-7").textContent()) ||
          "Not Available";

        const price =
          (await page.locator(".hero-price").textContent()) || "Not Available";
        const Price = `$${price}`;

        const Mileage =
          (await page.locator("span#spec-value-0").textContent()) ||
          "Not Available";

        const Doors =
          (await page.locator("span#spec-value-11").textContent()) ||
          "Not Available";

        const ExteriorColor =
          (await page.locator("span#spec-value-9").textContent()) ||
          "Not Available";

        const InteriorColor =
          (await page.locator("span#spec-value-10").textContent()) ||
          "Not Available";

        const FuelType =
          (await page.locator("span#spec-value-12").textContent()) ||
          "Not Available";

        const Transmission =
          (await page.locator("span#spec-value-6").textContent()) ||
          "Not Available";

        const Stock_Number =
          (await page.locator("span#spec-value-8").textContent()) ||
          "Not Available";

        const Description =
          (await page
            .locator("div#vdp-collapsible-short-text")
            .textContent()) || "Not Available";

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

        console.log(`Saving data: ${request.url}`);
        console.log(carDetails);
      } else {
        //when on the website's page
        console.log(`Enqueueing car listings for: ${request.url}`);

        const productSelector = ".dealer-split-wrapper > a";
        await page.waitForSelector(productSelector);
        await enqueueLinks({
          selector: linkableSelector,
          label: "DETAIL",
        });

        const nextPageSelector = "a.last-page-link";
        const nextButton = await page.$(nextPageSelector);
        if (nextButton) {
          await enqueueLinks({
            selector: nextPageSelector,
          });
        }
      }
    },
  });

  await crawler.run([
    "https://www.autotrader.ca/cars/bc/vancouver/?rcp=15&rcs=0&srt=35&prx=100&prv=British%20Columbia&loc=vancouver&hprc=True&wcp=True&sts=New&showcpo=1&inMarket=advancedSearch",
  ]);
}

module.exports = {
  startCrawler,
};
