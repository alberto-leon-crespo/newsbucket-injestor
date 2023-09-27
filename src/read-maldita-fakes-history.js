const puppeteer = require("puppeteer");
const {FakeNew, New} = require('./mongoose-module');
const md5 = require('md5');
const getFakeNewsPaginated = async (pageNumber) => {
    const browser = await puppeteer.launch({headless: process.env.PUPPETEER_HEADLESS});
    const page = await browser.newPage();
    try {
        await page.goto(
            `${process.env.MALDITA_BULO_URL}/${pageNumber}/`,
            {waitUntil: 'networkidle0'}
        );
        const fakes = await page.evaluate(async () => {
            const fakes = document.querySelectorAll("#section-articles-list .section-card");
            const fakeList = [];
            for (const fake of fakes) {
                const title = fake.querySelector(".section-card-headline a").textContent;
                const imgs = [fake.querySelector("#section-card-image").src];
                const link = fake.querySelector(".section-card-headline a").href;
                fakeList.push({
                    title: title,
                    imgs: imgs,
                    link: link,
                });
            }
            return fakeList;
        });
        for(const fake of fakes) {
            await page.goto(
                `${fake.link}`,
                {waitUntil: 'networkidle0'}
            );
            fake.content = await page.evaluate(async () => {
                const content = document.querySelector("#article-wrapper").textContent;
                return content.replace(/<img[^>]*>/g, '');
            });
            fake.content_hash = md5(fake.title + '\n' + fake.content);
        }
        await page.close();
        await browser.close();
        return fakes
    } catch (e) {
        console.log(`Error retrieving url ${process.env.MALDITA_BULO_URL}/${pageNumber}/. Error: ${e.message}.`);
        await page.close();
        await browser.close();
        return undefined;
    }
}

const getLastPage = async () => {
    const browser = await puppeteer.launch({headless: process.env.PUPPETEER_HEADLESS});
    const page = await browser.newPage();
    try {
        await page.goto(
            process.env.MALDITA_BULO_URL,
            {waitUntil: 'networkidle0'}
        );
        const lastPage = await page.evaluate(async () => {
            const lastPageUrl = document
                .querySelector("#articles-navigation span:last-child a")
                .href;
            return lastPageUrl.match(/\d+/g)[0];
        });
        await page.close();
        await browser.close();
        return lastPage
    } catch (e) {
        console.log(`Error getting ${process.env.MALDITA_BULO_URL} last page. Error: ${e.message}.`);
        await page.close();
        await browser.close();
        return undefined;
    }
}

const main = async () => {
    const lastPage = await getLastPage();
    for (let page = 1; page <= lastPage; page++) {
        const fakes = await getFakeNewsPaginated(page);
        if (fakes) {
            for(const fake of fakes) {
                const fakeObj = new FakeNew({
                    title: fake.title,
                    content: fake.content,
                    link: fake.link,
                    imgs: fake.imgs,
                    content_hash: fake.content_hash,
                    history: true
                });
                if ((await FakeNew.find({content_hash: fake.content_hash}).exec()).length < 1) {
                    const saved = await fakeObj.save();
                    console.log(`Saved fake new with id #${saved._id.toString()}`);
                } else {
                    console.log(`Discarted fake with content hash ${fake.content_hash} because fake new with same content hash alredy exists on database.`)
                }
            }
        }
    }
    process.exit();
}

main();