const crawl = require('./index');

(async () => {
    /*const data = await crawl.get('https://www.youtube.com/c/ratoborrachudo');
    const videos = data.getVideos();
    console.log(videos);*/
    //const channelInfo = data.getChannelInfo();
    //console.log(channelInfo);

    //const data = await crawl.get('https://www.youtube.com/c/FernandoUlrich_Oficial/channels');
    //console.log(data.getChannelsLink());

    const live = await crawl.inLive('UCdFJLb6-MvpprwBcz4F9E1Q');
    console.log(live);
})()