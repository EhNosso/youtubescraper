const crawl = require('./index');

(async () => {
    /*const data = await crawl.get('https://www.youtube.com/c/ratoborrachudo');
    const videos = data.getVideos();
    console.log(videos);*/
    //const channelInfo = data.getChannelInfo();
    //console.log(channelInfo);

    //const data = await crawl.get('https://www.youtube.com/channel/UCdFJLb6-MvpprwBcz4F9E1Q/channels');
    //console.log(data.getChannelsLink());

    //const live = await crawl.inLive('UCdFJLb6-MvpprwBcz4F9E1Q');
    //console.log(live);

    const community = await crawl.getCommunity('https://www.youtube.com/channel/UCLmvyoJW1wJlKY-l1KguCSw/community');
    console.log(community);
})()