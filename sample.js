const crawl = require('./index');

(async () => {
    const data = await crawl.get('https://www.youtube.com/channel/UCWZoPPW7u2I4gZfhJBZ6NqQ');
    const videos = data.getVideos();
    console.log(videos);
    const channelInfo = data.getChannelInfo();
    console.log(channelInfo);
})()