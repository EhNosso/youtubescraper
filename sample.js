const crawl = require('./index');

(async () => {
    const data = await crawl.get('https://www.youtube.com/channel/UC8E50x5nSbZ8XDv836RmgeQ');
    const videos = data.getVideos();
    console.log(videos);
    //const channelInfo = data.getChannelInfo();
    //console.log(channelInfo);

    //const data = await crawl.get('https://www.youtube.com/c/FernandoUlrich_Oficial/channels');
    //console.log(data.getChannelsLink());
})()