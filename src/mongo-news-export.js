const fs = require('fs');
const { Transform } = require('stream');
const { New } = require('./mongoose-module');
const { BigQuery } = require('@google-cloud/bigquery');
const { AllHtmlEntities } = require('html-entities');

let isHistoryMode = false;
for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--history=true') {
        isHistoryMode = true;
        break;
    }
}

let dateFilter = {};
if (!isHistoryMode) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateFilter = { createdAt: { $gte: yesterday } };
}

const CHUNK_SIZE = 8000;
const htmlEntities = new AllHtmlEntities();

async function writeInChunks() {
    try {
        const count = await New.countDocuments(dateFilter);
        let processed = 0;
        let chunkNumber = 1;
        const currentDate = new Date().toISOString().split('T')[0];

        const jsonTransform = new Transform({
            writableObjectMode: true,
            transform(chunk, encoding, callback) {
                this.push(JSON.stringify({
                    _id: chunk._id || '',
                    _feed: chunk._feed || '',
                    createdAt: chunk.createdAt || '',
                    // ... otros campos ...
                    content: htmlEntities.encode(chunk.content || ''),
                    // ... otros campos ...
                }) + ',\n');
                callback();
            }
        });

        const writeStream = fs.createWriteStream(`datasets/news/news-${currentDate}-${chunkNumber}.json`);
        writeStream.write('[\n');

        const readStream = New.find(dateFilter).cursor();

        readStream.on('data', (news) => {
            jsonTransform.write(news);
            processed++;
            if (processed % CHUNK_SIZE === 0) {
                const progress = `${processed}/${count}`;
                console.log(`Progreso: ${progress}`);
            }
        });

        readStream.on('end', () => {
            jsonTransform.end();
        });

        jsonTransform.pipe(writeStream, { end: false });

        jsonTransform.on('finish', () => {
            jsonTransform.unpipe(writeStream);
            writeStream.end('\n]'); // Cierra el array
            console.log(`Archivo JSON-${chunkNumber} escrito exitosamente`);
            chunkNumber++;
            if (processed < count) {
                writeStream = fs.createWriteStream(`datasets/news/news-${currentDate}-${chunkNumber}.json`);
                writeStream.write('[\n');
                jsonTransform.pipe(writeStream, { end: false });
            } else {
                mergeJsonChunks(currentDate, chunkNumber);
            }
        });

        jsonTransform.on('error', (err) => {
            console.error('Error en la transformación:', err);
        });

    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}

function mergeJsonChunks(date, totalChunks) {
    const mergedData = [];

    for (let i = 1; i <= totalChunks; i++) {
        const chunkData = fs.readFileSync(`datasets/news/news-${date}-${i}.json`, 'utf8');
        const parsedData = JSON.parse(chunkData);
        mergedData.push(...parsedData);
    }

    fs.writeFileSync(`datasets/news/news-${date}.json`, JSON.stringify(mergedData));
    console.log(`Archivos JSON fusionados exitosamente en news-${date}.json`);

    loadJsonToBigQuery(`datasets/news/news-${date}.json`);
}

async function loadJsonToBigQuery(filename) {
    const projectId = "newbucket-ia";
    const datasetId = "newsbucketia";
    const tableId = "news";

    const bigquery = new BigQuery({ projectId });

    const metadata = {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        autodetect: true,
        writeDisposition: isHistoryMode ? 'WRITE_TRUNCATE' : 'WRITE_APPEND'
    };

    const [job] = await bigquery
        .dataset(datasetId)
        .table(tableId)
        .load(filename, metadata);

    console.log(`Job ${job.id} completado.`);
}

async function main() {
    try {
        console.log('Generando archivos JSON por chunks...');
        await writeInChunks();

    } catch (err) {
        console.error('Error:', err);
    }
}

if (isHistoryMode) {
    console.log('Como se ha pasado el parametro history=true se cargarán todas las noticias desde el principio de los tiempos');
}

main();
