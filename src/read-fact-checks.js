const puppeteer = require('puppeteer');
const {New, FakeNew} = require("./mongoose-module");
const md5 = require('md5');

(async () => {
    // Iniciar el navegador
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    // Navegar a la página web de ejemplo
    await page.goto(
        'https://toolbox.google.com/factcheck/explorer/search/list:recent;hl=es',
        { waitUntil: 'networkidle0' }
    );

    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100; // Cambia este valor según lo que necesites
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100); // Cambia este valor según lo que necesites
        });
    });

    // Extraer el título de la página
    const articleLinks = await page.evaluate(() => {
        const elements = document.querySelectorAll('a[title="View article in a new window"]');
        return Array.from(elements).map(element => element.href);
    });

    // Navegar a cada enlace y extraer el título de la página y el contenido de la etiqueta <article>
    let savingCount = 0;
    for (const link of articleLinks) {
        try {
            await page.goto(link, { waitUntil: 'networkidle0' });
            // Resto del código para extraer datos...
        } catch (error) {
            console.log(`Error navegando a ${link}: ${error}`);
        }

        // Extraer el título de la página
        const pageTitle = await page.evaluate(() => document.querySelector('title').innerText);

        // Extraer el contenido de texto de la etiqueta <article>
        const articleContent = await page.evaluate((link) => {
            const articleElement = document.querySelector('article');
            if (articleElement && articleElement.textContent) {
                return articleElement.textContent;
            } else if(articleElement && articleElement.innerText) {
                return articleElement.innerText;
            } else {
                console.log(`Cant locate article for ${link}.`);
                return null;
            }
        }, link);

        // Extraer las URLs de las imágenes dentro de la etiqueta <article>
        const imageUrls = await page.evaluate(() => {
            const articleElement = document.querySelector('article');
            if (articleElement) {
                const images = articleElement.querySelectorAll('img');
                return Array.from(images).map(img => img.src.trim());
            }
            return [];
        });

        if (articleContent) {
            const fakeNew = new FakeNew({
                title: pageTitle.trim(),
                content: articleContent.trim(),
                link: link.trim(),
                imgs: (imageUrls.length > 0) ? imageUrls : [],
            });
            const contentHash = md5(fakeNew.title + fakeNew.content + fakeNew.link)
            fakeNew.content_hash = contentHash;
            if ((await FakeNew.find({content_hash: fakeNew.content_hash}).exec()).length < 1) {
                await fakeNew.save();
                savingCount++;
            }
        }
    }
    console.log('Proceso completado. Se ha actualizado la colección de falsas noticias. Se han leido un total de ' + articleLinks.length + ' falsas noticias y se han grabado un total de ' + savingCount + ' falsas noticias.');
    // Cerrar el navegador
    await browser.close();
    process.exit(0);
})();
