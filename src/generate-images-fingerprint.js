const { New, FakeNew } = require('./mongoose-module');
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");

let isHistoryMode = false;
let entity = undefined;
const CHUNK_SIZE = 150;
for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--collection=news') {
        entity = New;
    } else if (process.argv[i] === '--collection=fake_news') {
        entity = FakeNew;
    } else if (process.argv[i] === '--history=true') {
        isHistoryMode = true;
    }
}

if(!entity) {
    throw new Error("Must especify collection to process. Accepted collections are news and fake_news.");
}

let dateFilter = {};
if (!isHistoryMode) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateFilter = { createdAt: { $gte: yesterday } };
}

const main = async() => {
    const totalCount = await entity.countDocuments(dateFilter);
    const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);
    let processedCount = 0;

    for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
        const offset = (chunkNumber - 1) * CHUNK_SIZE;
        const chunkData = await entity.find(dateFilter).skip(offset).limit(CHUNK_SIZE).cursor();
        const writeData = [];

        for await (const newObject of chunkData) {
            const imgs = newObject.imgs;
            const imgCount = 0;
            for(const img of imgs) {
                try {
                    const response = await axios.get(img, {responseType: "arraybuffer"});
                    if (response.status >= 200 && response.status <= 299) {
                        const imageData = response.data;
                        const hash = crypto.createHash("md5");
                        hash.update(imageData);
                        const md5Hash = hash.digest("hex");
                        newObject[`img${imgCount}_fingerprint`] = md5Hash;
                    }
                } catch (e) {
                    console.log(`Error processing image. Error ${e.message}.`);
                }
            }
            await newObject.save()
            console.log("Updated new with id #" + newObject._id.toString());
            processedCount++;
        }

        const progress = `${processedCount}/${totalCount}\r`;
        process.stdout.write(`Progreso: ${progress}`);
    }
}

main()
