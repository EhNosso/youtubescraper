const axios = require("axios");
const fs = require("fs");

class CrawlYT {
    constructor(){
        this.data = {};
    }

    async get(url){
        try{
            const raw = (await axios.get(url)).data;
            const dataRaw = /var ytInitialData = (.*);<\/script>/.exec(raw)?.[1] || "{}";
            const ytInitialData = JSON.parse(dataRaw);
            this.data = ytInitialData;
            fs.writeFileSync("data.json", JSON.stringify(ytInitialData, null, 4));
            return this;
        }
        catch(e){
            this.data = {};
        }
    }

    getChannelInfo(){
        let data = {
            name: this.data.metadata.channelMetadataRenderer.title,
            youtube: this.data.metadata.channelMetadataRenderer.channelUrl,
            avatar: this.data.metadata.channelMetadataRenderer.avatar.thumbnails[0].url,
            customUrl: this.data.metadata.channelMetadataRenderer.vanityChannelUrl.split("/")[4] || this.data.metadata.channelMetadataRenderer.vanityChannelUrl.split("/")[3],
            links: [],
        };

        try{
            data.cover = this.data.header.c4TabbedHeaderRenderer.banner.thumbnails[5].url;
        }
        catch(e){}

        try{
            this.data.header.c4TabbedHeaderRenderer?.headerLinks?.channelHeaderLinksRenderer?.secondaryLinks.forEach((item) => {
                const urlParams = new URLSearchParams(item.navigationEndpoint.urlEndpoint.url);
                const link = urlParams.get('q');
                const name = item.title.simpleText;
                data.links.push({ name, link });
            });
        }
        catch(e){}

        try{
            const subscriberCountText = this.data.header.c4TabbedHeaderRenderer.subscriberCountText.simpleText;
            data.subscriberCount = parseInt(subscriberCountText.replace(/[^0-9]/g, ""));

            if(subscriberCountText.includes("K"))
                data.subscriberCount *= 1000;            
            else if(subscriberCountText.includes("M"))
                data.subscriberCount *= 1000000;            
            else if(subscriberCountText.includes("B"))
                data.subscriberCount *= 1000000000;
        }
        catch(e){}

        data.customUrl = data.name.replace(/\s/img, '').toLowerCase();

        return data;
    }

    getVideos(){
        let videos = [];
       
        for(let tab of this.data.contents.twoColumnBrowseResultsRenderer.tabs){
            if(tab.tabRenderer && tab.tabRenderer.content){
                for(let videoSession of tab.tabRenderer.content.sectionListRenderer.contents){
                    if(videoSession.itemSectionRenderer){
                        for(let videoInfo of videoSession.itemSectionRenderer.contents){                            
                            if(videoInfo.shelfRenderer){
                                for(let video of videoInfo.shelfRenderer.content.horizontalListRenderer.items){

                                    //try{
                                        if(video.gridVideoRenderer && video.gridVideoRenderer.publishedTimeText){
                                            let publishedAt = null;
                                            let publishedTimeText = video.gridVideoRenderer.publishedTimeText.simpleText;
                                            let publishedTimeTextSplited = publishedTimeText.split(" ");
                
                                            if(publishedTimeText.includes("years"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 60 * 24 * 365 * 1000));
                                            else if(publishedTimeText.includes("year"))
                                                publishedAt = new Date(new Date().getTime() - (60 * 60 * 24 * 365 * 1000));
                                            else if(publishedTimeText.includes("months"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 60 * 24 * 30 * 1000));
                                            else if(publishedTimeText.includes("months"))
                                                publishedAt = new Date(new Date().getTime() - (60 * 60 * 24 * 30 * 1000));
                                            else if(publishedTimeText.includes("weeks"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 60 * 24 * 7 * 1000));
                                            else if(publishedTimeText.includes("week"))
                                                publishedAt = new Date(new Date().getTime() - (60 * 60 * 24 * 7 * 1000));
                                            else if(publishedTimeText.includes("days"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 60 * 24 * 1000));
                                            else if(publishedTimeText.includes("day"))
                                                publishedAt = new Date(new Date().getTime() - (60 * 60 * 24 * 1000));
                                            else if(publishedTimeText.includes("hours"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 60 * 1000));
                                            else if(publishedTimeText.includes("hour"))
                                                publishedAt = new Date(new Date().getTime() - (60 * 60 * 1000));
                                            else if(publishedTimeText.includes("minutes"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 1000));
                                            else if(publishedTimeText.includes("seconds"))
                                                publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 1000));
                
                                            videos.push({
                                                channelId: this.data.header.c4TabbedHeaderRenderer.channelId,
                                                id: video.gridVideoRenderer.videoId,
                                                thumbnail: (video.gridVideoRenderer.thumbnail.thumbnails.length >= 4) ? video.gridVideoRenderer.thumbnail.thumbnails[3].url : video.gridVideoRenderer.thumbnail.thumbnails[2].url,
                                                title: video.gridVideoRenderer.title.simpleText,
                                                publishedAt,
                                                link: `https://www.youtube.com/watch?v=${video.gridVideoRenderer.videoId}`,
                                                viewCount: Number(video.gridVideoRenderer.viewCountText.simpleText.replace(" views", "").replace(",", "").trim()),
                                            })
                                        }
                                        
                                    //}
                                    //catch(e){}
                                }                                
                            }                            
                        }
                        
                    }
                }
            }
        }

        return videos;
    }
}

module.exports = new CrawlYT();