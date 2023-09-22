const fs = require('fs');
const { Transform } = require('stream');
const { Feed } = require('./mongoose-module');
const { BigQuery } = require('@google-cloud/bigquery');
const htmlenties = require('html-entities');

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
function isHTML(texto) {
    const patronHTML = /<[^>]+>/;
    return patronHTML.test(texto);
}

async function writeInChunks() {
    const chunksPaths = [];
    try {
        const currentDate = (new Date()).toISOString().split('T')[0];
        const totalCount = await Feed.countDocuments(dateFilter);
        const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);
        let processedCount = 0;

        for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
            const chunkPath = `datasets/feeds/feeds-${currentDate}-${chunkNumber}.json`;

            if (fs.existsSync(chunkPath)) {
                fs.unlinkSync(chunkPath);
            }

            const offset = (chunkNumber - 1) * CHUNK_SIZE;
            const chunkData = await Feed.find(dateFilter).skip(offset).limit(CHUNK_SIZE).cursor();
            const writeData = [];

            for await (const newObject of chunkData) {
                writeData.push({
                    id: newObject._id.toString(),
                    name: newObject.name,
                    url: newObject.url,
                    createdAt: new Date(newObject.createdAt),
                    updatedAt: new Date(newObject.updatedAt),
                });
                processedCount++;
            }

            writeData.forEach(object => {
                fs.appendFileSync(chunkPath, JSON.stringify(object) + '\n');
            });

            chunksPaths.push(chunkPath);

            const progress = `${processedCount}/${totalCount}\r`;
            process.stdout.write(`Progreso: ${progress}`);
        }

        return chunksPaths;

    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}

async function loadJsonFilesToBigQuery(filePaths) {
    const projectId = "newbucket-ia";
    const datasetId = "newsbucketia";
    const tableId = "feeds";

    for(let index=0; index < filePaths.length; index++) {
        const bigquery = new BigQuery({ projectId });
        if (index === 0 && isHistoryMode) {
            const metadata = {
                autodetect: true,
                writeDisposition: 'WRITE_TRUNCATE'
            };
            const [job] = await bigquery
                .dataset(datasetId)
                .table(tableId)
                .load(filePaths[index], metadata);

            console.log(`Fichero ${filePaths[index]} subido correctamente. Job ${job.id} completado`);
        } else {
            const metadata = {
                autodetect: true,
                writeDisposition: 'WRITE_APPEND'
            };
            const [job] = await bigquery
                .dataset(datasetId)
                .table(tableId)
                .load(filePaths[index], metadata);

            console.log(`Fichero ${filePaths[index]} subido correctamente. Job ${job.id} completado`);
        }
    }
    return;
}

async function main() {
    try {
        console.log(`\nGenerando archivos JSON en trozos de ${CHUNK_SIZE}...`);
        const chunksPaths = await writeInChunks();
        console.log(`Se van a subir a bigquery los siguientes ficheros:\n`);
        console.log(chunksPaths.join('\n'));
        console.log(`\n`)
        await loadJsonFilesToBigQuery(chunksPaths);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
    }
}

if (isHistoryMode) {
    console.log('Como se ha pasado el parametro history=true se cargarán todas las noticias desde el principio de los tiempos');
}

main();
