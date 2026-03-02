import https from 'https';
import fs from 'fs';
import path from 'path';

const cssUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&display=swap';
const userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.0'; // Old Firefox to force TTF

https.get(cssUrl, { headers: { 'User-Agent': userAgent } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find the URL ending with .ttf or any src: url(...)
        const match = data.match(/url\((https:\/\/[^)]+)\)/);
        if (match && match[1]) {
            const fontUrl = match[1];
            console.log('Found TTF URL:', fontUrl);

            // Ensure directory exists
            const dir = path.join(process.cwd(), 'public', 'fonts');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const dest = path.join(dir, 'NotoSansJP-Regular.ttf');
            const file = fs.createWriteStream(dest);

            https.get(fontUrl, (fontRes) => {
                fontRes.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('Font downloaded successfully to public/fonts/NotoSansJP-Regular.ttf');
                });
            }).on('error', (err) => {
                console.error('Error downloading font file:', err);
                fs.unlinkSync(dest);
            });

        } else {
            console.error('Could not find TTF URL in CSS:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching CSS:', err);
});
