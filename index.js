const axios = require("axios");
const fs = require("fs");
const { parse } = require("node-html-parser");

class CrawlYT {
    constructor(){
        this.data = {};
    }

    isValidDate(d) {
        return d instanceof Date;
    }

    async get(url){
        try{
            const raw = (await axios.get(url)).data;
            const dataRaw = /var ytInitialData = (.*);<\/script>/.exec(raw)?.[1] || "{}";
            const ytInitialData = JSON.parse(dataRaw);
            this.data = ytInitialData;
            //fs.writeFileSync("data.json", JSON.stringify(ytInitialData, null, 4));
            return this;
        }
        catch(e){
            this.data = {};
        }
    }

    getChannelInfo(){
        if(this.data.metadata){
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
        else{
            return null;
        }        
    }

    getVideos(){
        let videos = [];
       
        for(let tab of this.data.contents.twoColumnBrowseResultsRenderer.tabs){
            if(tab.tabRenderer && tab.tabRenderer.content){
                for(let videoSession of tab.tabRenderer.content.sectionListRenderer.contents){
                    if(videoSession.itemSectionRenderer){
                        for(let videoInfo of videoSession.itemSectionRenderer.contents){                            
                            if(videoInfo.shelfRenderer){
                                let items = [];
                                
                                try{
                                    items = (videoInfo.shelfRenderer.content.horizontalListRenderer) ? videoInfo.shelfRenderer.content.horizontalListRenderer.items : videoInfo.shelfRenderer.content.expandedShelfContentsRenderer.items;
                                }
                                catch(e){}
                                
                                for(let video of items){
                                    try{
                                        const itemVideo = (video.gridVideoRenderer) ? video.gridVideoRenderer: video.videoRenderer;

                                        if(itemVideo && itemVideo.publishedTimeText){
                                            let publishedAt = this.convertTimer(itemVideo.publishedTimeText.simpleText.replace("Streamed ", ""));
                                            
                                            const dataVideo = {
                                                channelId: this.data.header.c4TabbedHeaderRenderer.channelId,
                                                id: itemVideo.videoId,
                                                thumbnail: (itemVideo.thumbnail.thumbnails.length >= 4) ? itemVideo.thumbnail.thumbnails[3].url : itemVideo.thumbnail.thumbnails[2].url,
                                                title: itemVideo.title.simpleText,
                                                publishedAt,
                                                link: `https://www.youtube.com/watch?v=${itemVideo.videoId}`,
                                                viewCount: Number(itemVideo.viewCountText.simpleText.replace(" views", "").replace(",", "").trim()),
                                            };
                
                                            if(!isNaN(dataVideo.viewCount) && dataVideo.id && dataVideo.channelId && this.isValidDate(dataVideo.publishedAt))
                                                videos.push(dataVideo);
                                        }                                        
                                    }
                                    catch(e){
                                        //console.log(e);
                                    }
                                }                                
                            }                            
                        }
                        
                    }
                }
            }
        }

        return videos;
    }

    getChannelsLink(){
        let channelsReturn = [];

        if(this.data.contents){
            for(let tab of this.data.contents.twoColumnBrowseResultsRenderer.tabs){
                if(tab.tabRenderer && tab.tabRenderer.title == "Channels"){
                    for(let channelsSection of tab.tabRenderer.content.sectionListRenderer.contents){
                        if(channelsSection.itemSectionRenderer.contents){
                            const channels = channelsSection.itemSectionRenderer.contents;
    
                            for(let channelList of channels){
                                if(channelList.gridRenderer){
                                    for(let channel of channelList.gridRenderer.items){
                                        if(channel.gridChannelRenderer){
                                            channel = channel.gridChannelRenderer;
                                            channelsReturn.push({
                                                channelId: channel.channelId,
                                                thumbnail: channel.thumbnail.thumbnails[2].url,
                                                title: channel.title.simpleText,
                                            })
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return channelsReturn;
    }

    async inLive(channel){
        try{
            const response = await axios.get(`https://youtube.com/channel/${channel}/live`);
            const html = parse(response.data);
            const canonicalURLTag = html.querySelector('link[rel=canonical]')
            const canonicalURL = canonicalURLTag.getAttribute('href')
            const isStreaming = canonicalURL.includes('/watch?v=');

            return {
                status: isStreaming,
                url: canonicalURL
            }
        }
        catch(e){
            return {
                error: e,
                status: false
            }
        }
    }

    async getCommunity(channel){
        let contents = [];

        await this.get(channel);

        for(let tab of this.data.contents.twoColumnBrowseResultsRenderer.tabs){
            if(tab.tabRenderer && tab.tabRenderer.content){
                for(let videoSession of tab.tabRenderer.content.sectionListRenderer.contents){
                    if(videoSession.itemSectionRenderer){
                        for(let contentsInfo of videoSession.itemSectionRenderer.contents){      
                            if(contentsInfo.backstagePostThreadRenderer && contentsInfo.backstagePostThreadRenderer.post && contentsInfo.backstagePostThreadRenderer.post.backstagePostRenderer){
                                const post = contentsInfo.backstagePostThreadRenderer.post.backstagePostRenderer;
                                let backstageAttachment = null;

                                if(post.backstageAttachment){
                                    if(post.backstageAttachment.videoRenderer){
                                        let views = parseInt(post.backstageAttachment.videoRenderer.viewCountText.simpleText.replace(/[^0-9]/g, ""));
    
                                        backstageAttachment = {
                                            type: 'video',
                                            videoId: post.backstageAttachment.videoRenderer.videoId,
                                            title: post.backstageAttachment.videoRenderer.title.runs[0].text,
                                            thumbnail: post.backstageAttachment.videoRenderer.thumbnail.thumbnails[post.backstageAttachment.videoRenderer.thumbnail.thumbnails.length-1].url,
                                            publishedTime: this.convertTimer(post.backstageAttachment.videoRenderer.publishedTimeText.simpleText),
                                            description: post.backstageAttachment.videoRenderer.descriptionSnippet.runs[0].text,
                                            views
                                        }
                                    }
                                    else if(post.backstageAttachment.backstageImageRenderer){
                                        backstageAttachment = {
                                            type: 'image',
                                            imageUrl: post.backstageAttachment.backstageImageRenderer.image.thumbnails[post.backstageAttachment.backstageImageRenderer.image.thumbnails.length-1].url,
                                        }
                                    }
                                }

                                let likes = 0;

                                try{
                                    likes = post.voteCount.simpleText.replace(/[^0-9]/g, "");
                                }
                                catch(e){
                                    console.log(post.voteCount.simpleText);
                                }
                                
                                contents.push({
                                    postId: post.postId,
                                    likes: Number(likes),
                                    contents: post.contentText.runs.map((item) => item.text).join("\n"),
                                    publishedTime: this.convertTimer(post.publishedTimeText.runs[0].text),
                                    backstageAttachment                                    
                                });
                            }
                        }
                    }
                }
            }
        }
        
        return contents;
    }

    convertTimer(publishedTimeText){
        let publishedAt = null;
        let publishedTimeTextSplited = publishedTimeText.split(" ");

        if(publishedTimeText.includes("years"))
            publishedAt = new Date(new Date().getTime() - (Number(publishedTimeTextSplited[0]) * 60 * 60 * 24 * 365 * 1000));
        else if(publishedTimeText.includes("year"))
            publishedAt = new Date(new Date().getTime() - (60 * 60 * 24 * 365 * 1000));
        else if(publishedTimeText.includes("month"))
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

        return publishedAt;
    }
}

module.exports = new CrawlYT();