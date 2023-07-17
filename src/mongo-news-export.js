const {New, Connection} = require('./mongoose-module');
const fs = require('fs');
const path = require('path');
const jsonexport = require('jsonexport');

const chunkSize = 8000;
const query = {}; // Filtro de consulta (opcional)
const csvOutputFilePath = 'temp.csv';
const csvOutputSplitFilePath = path.resolve(`${process.cwd()}`, 'datasets', 'news');

if (fs.existsSync(csvOutputFilePath)) {
    fs.rmSync(csvOutputFilePath);
}

if (!fs.existsSync(csvOutputSplitFilePath)) {
    fs.mkdirSync(csvOutputSplitFilePath, {recursive: true});
}

async function splitFileByLines(inputFile, outputDir, linesPerChunk) {
    const inputStream = fs.createReadStream(inputFile);
    const lineReader = readline.createInterface({ input: inputStream });

    let lineNumber = 0;
    let chunkNumber = 1;
    let chunkLines = [];

    lineReader.on('line', (line) => {
        lineNumber++;
        chunkLines.push(line);

        if (lineNumber % linesPerChunk === 0) {
            const chunkFileName = `${outputDir}/chunk_${chunkNumber}.txt`;
            fs.writeFileSync(chunkFileName, chunkLines.join('\n'));
            chunkNumber++;
            chunkLines = [];
        }
    });

    lineReader.on('close', () => {
        // Escribir la última parte si quedaron líneas sin procesar
        if (chunkLines.length > 0) {
            const chunkFileName = `${outputDir}/chunk_${chunkNumber}.txt`;
            fs.writeFileSync(chunkFileName, chunkLines.join('\n'));
        }

        console.log('Archivo dividido en partes por líneas.');
    });
}

async function exportDocuments() {
    try {
        const totalDocuments = await New.countDocuments(query);
        const numChunks = Math.ceil(totalDocuments / chunkSize);
        const outputCsvStream = fs.createWriteStream(csvOutputFilePath);

        for (let i = 0; i < numChunks; i++) {
            const skip = i * chunkSize;

            const documents = await New.find(query).skip(skip).limit(chunkSize);

            const csvData = await new Promise(async (resolve, reject) => {
                // Mapear y escapar los documentos individualmente
                const escapedDocuments = documents.map((doc) => {
                    const { encode } = require('html-entities');
                    return {
                        _id: doc._id,
                        _feed: doc._feed,
                        link: doc.link,
                        title: doc.title,
                        content: encode(doc.content),
                        content_encoded: encode(doc.content_encoded),
                        creator: doc.creator,
                        dc_creator: doc.dc_creator,
                        categories: doc.categories,
                        pubDate: doc.pubDate,
                        enclosure: doc.enclosure,
                        imgs: doc.imgs,
                        createdAt: doc.createdAt,
                        updatedAt: doc.updatedAt,
                        contentHash: doc.contentHash
                    };
                });

                resolve(escapedDocuments);
            });

            const options = {
                // Serializar los datos correctamente
                textDelimiter: '"',
                rowDelimiter: ',',
                endOfLine: '\n',
                // Agregar comillas alrededor de cada campo
                forceTextDelimiter: true,
                includeHeaders: true,
            };

            // Convertir los documentos a formato CSV utilizando jsonexport

            try {
                const csv = await jsonexport(
                    csvData,
                    options
                );
                outputCsvStream.write(csv.toString());
                console.log(`Chunk ${i + 1}/${numChunks} procesado.`);
            } catch (err) {
                console.error(err);
            }

        }

        console.log('Conversión a CSV completada.');

        await splitFileByLines(csvOutputFilePath, csvOutputSplitFilePath, 8000);

        process.exit(0);
    } catch (error) {
        console.error(`Error durante la exportación: ${error.message}. Stack: ${error.stack}.`);
    }
}

exportDocuments();