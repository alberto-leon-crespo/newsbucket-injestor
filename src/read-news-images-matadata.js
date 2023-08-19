const fs = require('fs');
const path = require('path');
const ExifParser = require('exif-parser');
const axios = require('axios');
const { New, ImageMetadata } = require('./mongoose-module');

const CHUNK_SIZE = 8000;

function isDMSFormat(coordinate) {
    // Verificar si la cadena contiene los símbolos de DMS
    return /[°'"]/.test(coordinate);
}

function removeQueryParamsFromUrl(originalUrl) {
    const parsedUrl = new URL(originalUrl);
    parsedUrl.search = ''; // Elimina los parámetros de consulta
    return parsedUrl.toString();
}

function parseDMS(dmsArray) {
    const degrees = parseFloat(dmsArray[0]);
    const minutes = parseFloat(dmsArray[1]);
    const seconds = parseFloat(dmsArray[2]);

    return degrees + minutes / 60 + seconds / 3600;
}

function parseGPS(imagePath) {
    // Lee el archivo de imagen
    const imageBuffer = fs.readFileSync(imagePath);

    // Parsea los datos EXIF
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();

    if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
        let longitude;
        let latitude;

        if (isDMSFormat(result.tags.GPSLatitude) || isDMSFormat(result.tags.GPSLongitude)) {
            const dmsValuesLatitude = result.tags.GPSLatitude.split(',').map(value => value.trim());
            const dmsValuesLongitude = result.tags.GPSLongitude.split(',').map(value => value.trim());

            if (dmsValuesLatitude.length === 3 && dmsValuesLongitude.length === 3) {
                latitude = parseDMS(dmsValuesLatitude);
                longitude = parseDMS(dmsValuesLongitude);
            } else {
                throw new Error(`Formato DMS inválido para la imagen ${imagePath}.`);
            }
        } else {
            latitude = parseFloat(result.tags.GPSLatitude);
            longitude = parseFloat(result.tags.GPSLongitude);
        }

        return {
            latitude: latitude,
            longitude: longitude,
            metadata: (Object.keys(result.tags).length > 0) ? result.tags : null,
        };
    }

    return {
        latitude: null,
        longitude: null,
        metadata: (Object.keys(result.tags).length > 0) ? result.tags : null,
    };
}

function calculatePath(imageUrl, outputDirectory, newsId, imageNumber) {
    const urlParts = imageUrl.split('/');
    const fileNameWithParams = urlParts[urlParts.length - 1];
    const fileName = fileNameWithParams.split('?')[0]; // Tomar la parte antes de los parámetros de consulta

    const imageFileName = `${newsId}-${imageNumber}-${fileName}`; // Construir el nombre del archivo
    const outputPath = path.join(outputDirectory, imageFileName); // Ruta completa de salida

    return outputPath;
}

async function downloadImage(imageUrl, outputDirectory, newsId, imageNumber) {
    const outputPath = calculatePath(imageUrl, outputDirectory, newsId, imageNumber);
    try {
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        const stream = response.data.pipe(fs.createWriteStream(outputPath));

        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        return outputPath; // Devolver la ruta completa de la imagen descargada
    } catch (error) {
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        console.error('Error downloading image:', error);
        throw error;
    }
}

async function readNewsImagesMetadataAndUpdate() {
    const chunksPaths = [];
    try {
        const currentDate = (new Date()).toISOString().split('T')[0];
        const totalCount = await New.countDocuments({});
        const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);
        let processedCount = 0;

        for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
            const chunkPath = `datasets/news/news-${currentDate}-${chunkNumber}.json`;

            if (fs.existsSync(chunkPath)) {
                fs.unlinkSync(chunkPath);
            }

            const offset = (chunkNumber - 1) * CHUNK_SIZE;
            const chunkData = await New.find({}).skip(offset).limit(CHUNK_SIZE).cursor();

            for await (const newObject of chunkData) {
                if (newObject.imgs && newObject.imgs.length > 0) {
                    const imageNumber = 1;
                    for(const image of newObject.imgs) {
                        try {
                            const imagePath = await downloadImage(image, 'datasets/images', newObject._id.toString(), imageNumber);
                            // Esperamos 1 segundo antes de volver a solicitar una nueva imagen
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            const imageData = parseGPS(imagePath);
                            if (
                                imageData.latitude === null &&
                                imageData.longitude === null &&
                                imageData.metadata === null
                            ) {
                                continue;
                            } else {
                                const options = {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                }
                                const filter = {
                                    _new: newObject._id.toString(),
                                };
                                await ImageMetadata.findOneAndUpdate(
                                    filter,
                                    {
                                        _new: newObject._id,
                                        latitude: imageData.latitude,
                                        longitude: imageData.longitude,
                                        metadata: JSON.stringify(imageData.metadata)
                                    },
                                    options
                                );
                                if (fs.existsSync(imagePath)) {
                                    fs.unlinkSync(imagePath);
                                }
                            }
                        } catch (e) {
                            const imagePath = calculatePath(image, 'datasets/images', newObject._id.toString(), imageNumber);
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                            console.error(`\nError procesando la imagen ${image} de la noticia ${newObject._id.toString()}. Error: ${e.message}. Stack: ${e.stack}`);
                        }
                    }
                }
                processedCount++;
                const progress = `${processedCount}/${totalCount}\r`;
                process.stdout.write(`Progreso: ${progress}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}

readNewsImagesMetadataAndUpdate()