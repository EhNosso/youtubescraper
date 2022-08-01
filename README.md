# Youtube Scraper

Scraper for YT

## Install

```bash
$ npm install @ehnosso/youtubescraper
```

or

```bash
$ yarn add @ehnosso/youtubescraper
```

## Usage

```js
const crawl = require('@ehnosso/youtubescraper');

(async () => {
    const data = await crawl.get('https://www.youtube.com/c/FernandoUlrich_Oficial');
    const videos = data.getVideos();
    console.log(videos);
    const channelInfo = data.getChannelInfo();
    console.log(channelInfo);
})()
```