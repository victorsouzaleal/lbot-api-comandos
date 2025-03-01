import fs from 'fs-extra'
import {getTempPath, formatSeconds} from './util.js'
import {convertMP4ToMP3} from './video.js'
import Youtube from 'youtube-sr'
import ytdl from '@distube/ytdl-core'
import {instagramGetUrl, InstagramResponse} from 'instagram-url-direct'
import { getFbVideoInfo } from 'fb-downloader-scrapper'
import Tiktok from '@tobyg74/tiktok-api-dl'
import axios from 'axios'
import { FacebookMedia, InstagramMedia, TiktokMedia, TwitterMedia, YTInfo } from './interfaces.js'

const yt_agent = ytdl.createAgent([{name: 'cookie1', value: 'GPS=1; YSC=CkypMSpfgiI; VISITOR_INFO1_LIVE=4nF8vxPW1gU; VISITOR_PRIVACY_METADATA=CgJCUhIEGgAgZA%3D%3D; PREF=f6=40000000&tz=America.Sao_Paulo; SID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbH4SZC5IHPqi_QBmSiigPHAACgYKAYgSARASFQHGX2Mi3N21zLYOMAku61_CaeccrxoVAUF8yKo3X97N4REFyHP4du4RIo1b0076; __Secure-1PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-3PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-1PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbYpnHl6jq9y45aoBaqMd96QACgYKAR4SARASFQHGX2MiqFuOgRtuIS_FKmulaCrckxoVAUF8yKpX5r8ISh5S5eQ4eofBuyCg0076; __Secure-3PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDb_8Q3teG8nn23ceeF8jiOvwACgYKAY0SARASFQHGX2MiwBtnenbu4CRMpjQza-asfhoVAUF8yKoFXx_Zxl4MvxGnWSSsnv1z0076; HSID=AWgIQn3iifuaU_eRW; SSID=AR8Jlj2XTnPAmL5kf; APISID=l6PTqM9Dy8G_2E6P/A-sAusHOyG1pQ3T75; SAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-1PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-3PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; LOGIN_INFO=AFmmF2swRQIgShGx2tfQkQV4F8lyKnh4mwj54yTOPJqEdI44sDTtsrwCIQD870Le1gTMDFpz7rRHS6Fk0HzraG_SxHw_PdyLjUDXxg:QUQ3MjNmeVpqbVhSQlNCMnFFZXBKQkhCTHJxY1NXOVlYcG50SHNNOGxGZGZ3Z2ZobWwyOW95WGJ2LVplelNaZ0RfbGU3Tm1uYktDdHBnVm9fd3N3T0NncVpTN0ZaNlRoTTVETDJHSjV6QkxUWmdYWGx0eVFYeEFqa0gxUGdBYUJKbG5oQ2pBd3RBb0ROWXBwcFQwYkpBRktEQXlWbmZIbHJB; SIDCC=AKEyXzXkXTftuhPOtObUSCLHxp1byOAtlesMkptSGp8hyE3d97Dvy2UHd4-2ePWBpzUbQhV6; __Secure-1PSIDCC=AKEyXzXlrhkCIONPS4jCvhmtFb8nAKr8fEFCCFEFqN8BKyrw8tKHFh3-r8EWjrqjAKH9Z9fq0A; __Secure-3PSIDCC=AKEyXzWLIbNbh8dxdyKhTafkyKIbEBwVKGR4lNRhhYX5u_v1k4vBnu4eAS9lgpP-JK2PgiSDJw'}])

export function twitterMedia (url: string){
    return new Promise <TwitterMedia> ((resolve)=>{
        url = url.replace(/twitter\.com|x\.com/g, 'api.vxtwitter.com')
        axios.get(url).then(({data}) =>{
            let medias : {type: "video" | "image", url: string}[] = []

            data.media_extended.forEach((media : {type: string, url: string})=>{
                medias.push({
                    type: (media.type === 'video') ? 'video' : 'image',
                    url: media.url
                })
            })

            resolve({
                text: data.text,
                media : medias
            })
        }).catch(()=>{
            throw new Error('Erro ao obter a mídia, verifique o link ou tente mais tarde.')
        })
    })
}

export function tiktokMedia (url : string){
    return new Promise <TiktokMedia> ((resolve)=>{
        Tiktok.Downloader(url, {version: "v1"}).then((res)=>{
            if(res.status == "success"){
                resolve({
                    author_profile: res.result?.author.nickname,
                    description : res.result?.description,
                    type: (res.result?.type === "video") ? "video" : "image",
                    duration: res.result?.type == "video" ? parseInt(((res.result?.video?.duration as number)/1000).toFixed(0)) : null,
                    url: res.result?.type == "video" ? res.result?.video?.playAddr[0] as string : res.result?.images as string[]
                })
            } else {
                throw new Error("Erro ao obter a mídia, verifique o link ou tente mais tarde.")
            }
        }).catch(()=>{
            throw new Error("Erro ao obter a mídia, verifique o link ou tente mais tarde.")
        })
    })
}

export function facebookMedia(url : string) {
    return new Promise <FacebookMedia> ((resolve)=>{
        getFbVideoInfo(url).then((res)=>{
            resolve({
                url: res.url,
                duration: parseInt((res.duration_ms/1000).toFixed(0)),
                sd: res.sd,
                hd: res.hd,
                title: res.title,
                thumbnail: res.thumbnail
            })
        }).catch(()=>{
            throw new Error("Erro ao obter a mídia, verifique o link ou tente mais tarde.")
        })
    })
}

export function instagramMedia (url: string){
    return new Promise <InstagramMedia> ((resolve)=>{ 
        instagramGetUrl(url).then(async (res : InstagramResponse)=>{
            let mediasInstagram : {type: "video" | "image", buffer: Buffer}[] = []

            for (const url of res.url_list) {
                axios.get(url, { responseType: 'arraybuffer' }).then(({data, headers})=>{
                    const buffer = Buffer.from(data, 'utf-8')
                    const type = headers['content-type'] === 'video/mp4' ? 'video' : 'image'
                    mediasInstagram.push({type, buffer})
                }).catch(()=>{})                    
            }

            if(!mediasInstagram) {
                throw new Error("Não foi possível fazer download de nenhuma mídia deste link.")
            }

            resolve({
                author_username : res.post_info.owner_username,
                author_fullname: res.post_info.owner_fullname,
                caption: res.post_info.caption,
                likes: res.post_info.likes,
                media : mediasInstagram
            })
        }).catch(()=>{
            throw new Error("Houve um erro ao tentar obter as mídias do Instagram, verifique o link e tente novamente.")
        })
    })  
}

export function ytInfo (text : string){
    return new Promise <YTInfo> ((resolve)=>{ 
        const isURLValid = ytdl.validateURL(text)
        let videoId : string | undefined

        if(isURLValid){
            videoId = ytdl.getVideoID(text)
        } else {
            Youtube.default.searchOne(text).then((video)=>{
                videoId = video.id

                if(!videoId){
                    throw new Error ('Houve um erro ao obter os dados do vídeo.')
                }
                
                ytdl.getInfo(videoId, { 
                    playerClients: ["WEB", "WEB_EMBEDDED", "ANDROID", "IOS"], 
                    agent: yt_agent
                }).then(video=>{
                    const formats = ytdl.filterFormats(video.formats, "videoandaudio");
                    const format = ytdl.chooseFormat(formats, {quality: 'highest'})
                    resolve({
                        id_video : video.player_response.videoDetails.videoId,
                        title:  video.player_response.videoDetails.title,
                        description: video.player_response.videoDetails.shortDescription,
                        duration: video.player_response.videoDetails.lengthSeconds,
                        keywords: video.player_response.videoDetails.keywords,
                        id_channel: video.player_response.videoDetails.channelId,
                        duration_formatted: formatSeconds(parseInt(video.player_response.videoDetails.lengthSeconds)),
                        format
                    })                       
                }).catch((err)=>{
                    if(err.message == "Status code: 410") {
                        throw new Error ('O video parece ter restrição de idade ou precisa de ter login para assistir.')
                    } else {
                        throw err
                    }
                })
            }).catch(()=>{
                throw new Error('Houve um erro ao obter as informações do video.')
            })
        }
    })
}

export function ytMP4 (text : string){
    return new Promise <Buffer> (async (resolve)=>{
        const videoOutputFile = getTempPath('mp4')
        const videoInfo = await ytInfo(text)
        const videoStream = ytdl(videoInfo?.id_video, {format: videoInfo?.format, agent: yt_agent})
        videoStream.pipe(fs.createWriteStream(videoOutputFile))
        videoStream.on("end", ()=>{
            const videoBuffer = fs.readFileSync(videoOutputFile)
            fs.unlinkSync(videoOutputFile)
            resolve(videoBuffer)
        }).on('error', ()=>{
            throw new Error("Houve um erro ao fazer o download do vídeo, tente outro video ou tente mais tarde.")
        })
    })    
}


export function ytMP3 (text : string){
    return new Promise <Buffer> (async (resolve)=>{
        const videoBuffer = await ytMP4(text)
        const audioBuffer = await convertMP4ToMP3(videoBuffer)
        resolve(audioBuffer)
    })
}

