const puppeteer = require('puppeteer');
const {Feed, Media} = require('./mongoose-module');
const dotenv = require('dotenv');

dotenv.config();

async function scrapeFeeds(mediaList) {
  const browser = await puppeteer.launch({headless: process.env.PUPPETEER_HEADLESS});
  const scrapedMedia = [];

  for (const media of mediaList) {
    try {
      const page = await browser.newPage();
      await page.goto(media.url, { waitUntil: 'networkidle2' });

      const feedLink = await page.$('link[type="application/rss+xml"]');
      if (feedLink) {
        const feedUrl = await feedLink.evaluate((el) => el.href);
        if (feedUrl) {
          scrapedMedia.push(Feed.create({ name: media.name, url: feedUrl }));
        }
      }

      await page.close();
    } catch (error) {
      console.error(`Error al acceder a la página ${media.name}. Saltando a la siguiente página. Error: ${error.message}.`);
    }
  }

  await browser.close();

  return scrapedMedia;
}

async function saveFeedsToMongo(mediaList) {
  for (const media of mediaList) {
    console.log(media);
    const mediaObject = new Feed({name: media.name, url: media.url})
    await mediaObject.save()
  }
}

async function run() {
  const mediasList = await Media.find({}).exec();
  console.log(mediasList);
  const scrapedMedia = await scrapeFeeds(mediasList);
  console.log(scrapedMedia);
  await saveFeedsToMongo(scrapedMedia);
  console.log('Scraping completado y datos guardados en mongodb en la colección feeds.');
  process.exit(0);
}

run().catch(console.error);