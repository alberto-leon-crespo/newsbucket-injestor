const Parser = require('rss-parser');
const {Feed, New} = require('./mongoose-module');
const md5 = require('md5');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dayjs = require('dayjs')

const parser = new Parser();

async function readFeeds() {
  try {
    const feeds = await Feed.find({}).exec();
    const news = await fetchNews(feeds);
    const savingCount = await saveNewsToMongo(news);
    console.log('Proceso completado. Se ha actualizado la colección de noticias. Se han leido un total de ' + feeds.length + ' feeds y se han grabado un total de ' + savingCount + ' noticias.');
    return Promise.resolve();
  } catch (error) {
    Promise.reject(error);
  }
}

async function fetchNews(feeds) {
  const news = [];
  for (const feed of feeds) {
    try {
      const feedData = await parser.parseURL(feed.url);
      // const filePath = path.resolve(process.cwd(), 'feeds', `${feed.name}.json`);
      // const feedsPath = path.resolve(process.cwd(), 'feeds');
      // if (!fs.existsSync(feedsPath)) {
      //   fs.mkdirSync(feedsPath);
      // }
      // await fs.writeFileSync(filePath, JSON.stringify(feedData, null, 2));
      if (feedData) {
        for (const item of feedData.items) {
          news.push({
            _feed: feed._id.toString(),
            link: (item.link) ? item.link : undefined,
            title: (item.title) ? item.title : undefined,
            description: (item.description) ? item.description : undefined,
            content: (item.content) ? item.content : undefined,
            content_encoded: (item['content:encoded']) ? item['content:encoded'] : undefined,
            content_encoded_snippet: (item.contentEncodedSnippet) ? item.contentEncodedSnippet : undefined,
            content_snippet: (item.contentSnippet) ? item.contentSnippet : undefined,
            creator: (item.creator) ? item.creator : undefined,
            dc_creator: (item['dc:creator']) ? item['dc:creator'] : undefined,
            categories: (item.categories) ? item.categories : undefined,
            pubDate: (item.pubDate) ? item.pubDate : undefined,
            comments: (item.comments) ? item.comments : undefined,
            enclosure: {
              type: (item.enclosure && item.enclosure.type) ? item.enclosure.type : undefined,
              url: (item.enclosure && item.enclosure.url) ? item.enclosure.url : undefined,
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Error al leer el feed de ${feed.url}. Error: ${error.message}. Stack: ${error.stack}`);
    }
  }
  return news;
}

function extractImageUrls(articleHtml) {
  try {
    const $ = cheerio.load(articleHtml);
    // Utiliza un selector CSS para identificar las etiquetas de imagen y extraer la ruta del atributo src
    return $('img').map((index, element) => $(element).attr('src')).get();
  } catch (error) {
    console.warn(`Error al recuperar images de la noticia. Error: ${error.message}. Stack: ${error.stack}`);
    return [];
  }
}

async function saveNewsToMongo(data) {
  let savingCount = 0;
  for (const item of data) {
    try {
      const newObject = new New({
        _feed: (item._feed) ? item._feed : undefined,
        link: (item.link) ? item.link : undefined,
        title: (item.title) ? item.title : undefined,
        description: (item.description) ? item.description : undefined,
        content: (item.content) ? item.content : undefined,
        content_encoded: (item.content_encoded) ? item.content_encoded : undefined,
        content_encoded_snippet: (item.content_encoded_snippet) ? item.content_encoded_snippet : undefined,
        content_snippet: (item.contentSnippet) ? item.contentSnippet : undefined,
        creator: (item.creator) ? item.creator : undefined,
        dc_creator: (item.dc_creator) ? item.dc_creator : undefined,
        categories: (item.categories) ? item.categories : undefined,
        pubDate: (item.pubDate) ? item.pubDate : undefined,
        comments: (item.comments) ? item.comments : undefined,
        enclosure: {
          type: (item.enclosure && item.enclosure.type) ? item.enclosure.type : undefined,
          url: (item.enclosure && item.enclosure.url) ? item.enclosure.url : undefined,
        }
      });
      let imgs = [];
      if (item.content_encoded !== undefined) {
        imgs = extractImageUrls(item.content_encoded);
        newObject.contentHash = md5(item.content_encoded);
      } else if (item.content_encoded_snippet !== undefined) {
        imgs = extractImageUrls(item.content_encoded_snippet);
      } else if (item.content_encoded_snippet !== undefined) {
        imgs = extractImageUrls(item.content_snippet);
      } else {
        if (item.content !== undefined) {
          imgs = extractImageUrls(item.content);
        }
        if (item.content) {
          newObject.contentHash = md5(item.content);
        }
      }
      if (imgs.length > 0) {
        if (!item.enclosure.url && !item.enclosure.type) {
          try {
            const imageResponse = await axios.get(imgs[0]);
            newObject.enclosure = {
              type: imageResponse.headers.get('Content-Type'),
              url: imgs[0]
            };
          } catch (error) {
            console.warn(`Error al recuperar la imagen del articulo ${link}.`);
          }
        }
      }
      newObject.imgs = imgs;
      if ((await New.find({contentHash: newObject.contentHash}).exec()).length < 1) {
        await newObject.save();
        savingCount++;
      }
    } catch (error) {
      console.warn(`Error almacenando la noticia con titulo ${item.title}. Error: ${error.message}. Stack: ${error.stack}. Feed: ${item._feed}.`);
    }
  }
  return savingCount;
}

function parseDateFromFormat(input, format) {
  format = format || 'yyyy-mm-dd'; // default format
  var parts = input.match(/(\d+)/g),
      i = 0, fmt = {};
  // extract date-part indexes from the format
  format.replace(/(yyyy|dd|mm)/g, function(part) { fmt[part] = i++; });

  return new Date(parts[fmt['yyyy']], parts[fmt['mm']]-1, parts[fmt['dd']]);
}

readFeeds();