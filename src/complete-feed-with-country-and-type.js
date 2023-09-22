const { Media, Feed} = require('./mongoose-module');

const main = async () => {
    const medias = await Media.find().cursor();
    for await (const media of medias) {
        const feeds = await Feed.find().cursor();
        for await (const feed of feeds) {
            const textToSearch = media.url;
            const position = feed.url.indexOf(textToSearch);
            if(position !== -1) {
                feed.country = media.country;
                feed.type = media.type;
                await feed.save();
                console.log(`Updated feed #${feed._id.toString()} with country and media type.`)
            }
        }
    }
    process.exit();
}

main();

