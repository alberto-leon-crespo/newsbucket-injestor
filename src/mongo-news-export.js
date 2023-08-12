const {New} = require('./mongoose-module');
const fs = require('fs');

if (!fs.existsSync('datasets/news')) {
    fs.mkdirSync('datasets/news');
}

const writeStream = fs.createWriteStream('datasets/news/noticias.csv');

// Escribe el encabezado en el archivo CSV
writeStream.write('"_id","_feed","createdAt","creator","pubDate","updatedAt","__v","categories","dc_creator","title","content","enclosure","contentHash","content_encoded","imgs","link"\n');

const CHUNK_SIZE = 8000;

async function writeInChunks() {
    try {
        // Conexión a MongoDB
        const count = await New.countDocuments({});
        let processed = 0;

        while (processed < count) {
            const newsList = await New.find({}).skip(processed).limit(CHUNK_SIZE);
            for (const news of newsList) {
                const csvLine = `"${news._id}","${news._feed}","${news.createdAt}","${news.creator}","${news.pubDate}","${news.updatedAt}","${news.__v}","${news.categories.join('|')}","${news.dc_creator}","${news.title}","${news.content}","${news.enclosure}","${news.contentHash}","${news.content_encoded}","${news.imgs.join('|')}","${news.link}"\n`;
                writeStream.write(csvLine);
            }

            processed += CHUNK_SIZE;
            console.log(`Procesados ${processed} de ${count} registros`);
        }

        writeStream.end();
        console.log('CSV escrito exitosamente');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        writeStream.end();
    }
}

writeInChunks();