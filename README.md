# Crawlee + PlaywrightCrawler + JavaScript project

This is web scraper for scrapping websites that contain javascript rendered pages.
It scraps the some details about the products listed on the website and stores the collected results in the datasets folder in json format.
It is also hosted on apify

This code below will save the results of the scraper into the datasets folder in json and csv format.

- await Dataset.exportToCSV("scrapped-data");
- await Dataset.exportToJSON("scrapped-data");

This saves the car details directly into the dataset

- await dataset.pushData(carDetails);
# scrapers-simplified
# scrapers-simplified
