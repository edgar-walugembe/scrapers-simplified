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

async function startCrawler() {
  const browser = await playwright.chromium.launch({
    headless: true,
    proxy: {
      server: "204.44.109.65:5586",
      username: "gwiheggj",
      password: "irq9m6nictiy",
    },
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

    const baseURL = "https://www.mazdaofseattle.com";
    const productLocators = page.locator("ul.dep_image_slider_ul_style");
    const carLinks = await productLocators.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-vdp_link"))
    );

    const fullURLs = carLinks.map((carLink) =>
      carLink.startsWith("http") ? carLink : `${baseURL}${carLink}`
    );

    console.log(`Found ${fullURLs.length} car links`);

    for (const fullURL of fullURLs) {
      carCounter++;

      await page.goto(fullURL, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForURL(fullURL, { timeout: 120000 });

      try {
        function extractCarDetails(url) {
          // const regex = /\/new-(\d{4})-(mazda)-([\w\d]+)(?:-([\w\d-]+))?-.*$/;
          const regex =
            /\/new-(\d{4})-(mazda)-(mazda[\w\d]*[\w\d]+|[\w\d]+(?:-\d+)*)-([\w\d-]+)-.*$/i;
          const match = url.match(regex);

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

          if (match) {
            const year = match[1];
            const make = match[2].replace(/-/g, " ");
            let model = match[3].replace(/-/g, " ");
            model = model.replace(/\b\d+\b/g, "").trim();

            bodyTypes.forEach((type) => {
              const regexType = new RegExp(`\\b${type}\\b`, "i");
              model = model.replace(regexType, "").trim();
            });

            if (!model.toLowerCase().startsWith("mazda")) {
              model = "Mazda " + model;
            }

            return { year, make, model };
          } else {
            console.log("No match found for car details in the URL.");
          }
        }

        const { year, make, model } = extractCarDetails(fullURL) || {};

        const Year = year || "Year Not Found";
        const Make = make || "Make Not Found";
        const Model = model || "Model Not Found";

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
            ],
            coupe: [
              "coupe",
              "sports coupe",
              "grand tourer",
              "hardtop coupe",
              "luxury coupe",
              "performance coupe",
              "sports-utility",
              "sport utility",
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
        const BodyType = getBodyTypeFromUrl(fullURL);

        const Location = "Seattle";

        let Price;
        if (await page.isVisible('dt:has-text("Mazda of Seattle Price")')) {
          const priceElement = page
            .locator('dt:has-text("Mazda of Seattle Price")')
            .locator("xpath=following-sibling::dd[1]");
          const price = await priceElement.textContent();
          Price = price.trim().replace(/[$,\s]+/g, "");
        } else if (await page.isVisible("dd.vehicle_price")) {
          const priceElement = page.locator("dd.vehicle_price");
          const price = await priceElement.textContent();
          Price = price.trim().replace(/[$,\s]+/g, "");
        } else {
          Price = "Not Available";
        }

        Price = parseFloat(Price)
          ? `$${parseFloat(Price).toLocaleString()}`
          : Price;

        const Trim = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Trim')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Trim')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const Mileage = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Mileage')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Mileage')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const ExteriorColor = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Exterior Color')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Exterior Color')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const InteriorColor = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Interior Color')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Interior Color')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const Transmission = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Transmission')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Transmission')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const Engine = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Engine')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Engine')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const DriveTrain = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Drivetrain')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Drivetrain')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const Stock_Number = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Stock #')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Stock #')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const VIN = (await page
          .locator(
            "tr:has(td.details-overview_title:text('VIN')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('VIN')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const Doors = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Doors')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Doors')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const Seats = (await page
          .locator(
            "tr:has(td.details-overview_title:text('Passengers')) >> td.details-overview_data"
          )
          .isVisible())
          ? await page
              .locator(
                "tr:has(td.details-overview_title:text('Passengers')) >> td.details-overview_data"
              )
              .textContent()
          : "Not Available";

        const isViewGalleryButtonVisible = await page.isVisible(
          "div.vdp-vehicle_link_buttons a.dep_image_slider_view_all.redesign"
        );
        let OtherCarImages = [];
        if (isViewGalleryButtonVisible) {
          try {
            await page.click("a.dep_image_slider_view_all");
            await page.waitForTimeout(60000);
            if (
              await page.isVisible(
                "div.view_all_images_wrapper img.veh-image-tag.cld-gallery-processed"
              )
            ) {
              await page.waitForSelector(
                "div.view_all_images_wrapper img.veh-image-tag.cld-gallery-processed"
              );
              OtherCarImages = await page.$$eval(
                "div.view_all_images_wrapper img.veh-image-tag.cld-gallery-processed",
                (imgs) => imgs.map((img) => img.src)
              );
            }
          } catch (error) {
            console.log("Error fetching additional images:", error);
          }
        } else {
          console.log(`Zoom Icon absent for car at: ${fullURL}`);
        }

        const CoverImage =
          OtherCarImages[0] ||
          "https://www.jpsubarunorthshore.com/wp-content/themes/convertus-achilles/achilles/assets/images/srp-placeholder/PV.jpg";

        const carDetails = {
          car_url: fullURL,
          carId: uuidv4(),
          Location,
          Make: Make.toLowerCase(),
          Model: Model.toLowerCase(),
          Trim,
          Mileage,
          BodyType,
          Year,
          Price,
          ExteriorColor,
          InteriorColor,
          Transmission,
          Engine,
          DriveTrain,
          Doors,
          Seats,
          CoverImage,
          OtherCarImages,
          Stock_Number,
          VIN,
        };

        console.log(`Car_Number: #${carCounter}`);
        await sendCarToBubble(carDetails);
        console.log(carDetails);
      } catch (error) {
        console.error(`Error scraping car at ${fullURL}:`, error);
      }

      await page.waitForTimeout(5000);
    }
  }
}

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
