const {FakeNew, New} = require('./mongoose-module');
const axios = require("axios");
const puppeteer = require("puppeteer");
const md5 = require('md5');

const getToken = async () => {
    const response = await axios.get(process.env.NEWTRAL_TOKEN_URL, {
        headers: {
            authorization: process.env.NEWTRAL_BASIC_AUTH
        }
    })
    if (response.status === 200) {
        return response.data.authorization;
    }
    throw new Error("Error retrieving api token for newtral.")
}

let apiToken = getToken();

const getFakesPaginated = async (
    page = 1,
    per_page = 15,
    start_date = '2018-01-01',
    end_date = '2023-09-24'
) => {
    const newtralUrl = process.env.NEWTRAL_FAKES_URL
        .replace(':page', page)
        .replace(':per_page', per_page)
        .replace(':start_date', start_date)
        .replace(':end_date', end_date)
    const response = await axios.get(newtralUrl);
    if (response.status === 200) {
        return response.data;
    }
    throw new Error(`Error getting paginated fake news page for newtral. Error status: ${response.status}. Error body response: ${JSON.stringify(response.data)}`)
}

const visitUrlAndRetrieveContent = async (url) => {
    const browser = await puppeteer.launch({headless: process.env.PUPPETEER_HEADLESS});
    const page = await browser.newPage();

    // Navegar a la página web de ejemplo
    await page.goto(
        url,
        { waitUntil: 'networkidle0' }
    );

    const fakeContent = await page.evaluate(async () => {
        const content =  document.querySelector(".entry-content").textContent;
        return content.replace(/<img[^>]*>/g, '');
    });

    await browser.close();

    return fakeContent
}

const main = async () => {
    axios.defaults.headers.common['Authorization'] = await getToken();
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    const firstResponse = await getFakesPaginated();
    const totalResults = firstResponse.total_results;
    let totalPages = totalResults / 15;
    if (totalResults % 15 !== 0) {
        totalPages++;
    }
    for(let page= 1; page <= totalPages; page++) {
        const response = await getFakesPaginated(page);
        for(const fake of response.data) {
            const title = fake.title;
            const subtitle = fake.subtitle;
            const link = fake.url;
            const imgs = fake.alternateImage.data.url;
            const content = await visitUrlAndRetrieveContent(link);
            const contentHash = md5(`${title}\n${subtitle}\n${content}`);
            const fakeNew = new FakeNew({
                title: title + "\n" + subtitle,
                content: content,
                link: link,
                imgs: [imgs],
                content: imgs,
                content_hash: contentHash
            });
            if ((await FakeNew.find({content_hash: contentHash}).exec()).length < 1) {
                const saved = await fakeNew.save();
                console.log(`Saved fake new with id #${saved._id.toString()}`);
            } else {
                console.log(`Discarted fake with content hash ${contentHash} because fake new with same content hash alredy exists on database.`)
            }
        }
    }
}

main();