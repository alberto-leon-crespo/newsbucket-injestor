const {New, Connection} = require('./mongoose-module');
const fs = require('fs');
const jsonexport = require('jsonexport');

const chunkSize = 1000;
const query = {}; // Filtro de consulta (opcional)
const csvOutputFilePath = 'temp.csv';

if (fs.existsSync(csvOutputFilePath)) {
    fs.rmSync(csvOutputFilePath);
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
            } catch (err) {
                console.error(err);
            }

            console.log(`Chunk ${i + 1}/${numChunks} procesado.`);
        }

        console.log('Conversión a CSV completada.');
    } catch (error) {
        console.error(`Error durante la exportación: ${error.message}. Stack: ${error.stack}.`);
    }
}

exportDocuments();