import fs from 'fs-extra'
import {obterCaminhoTemporario, formatarSegundos} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import Youtube from 'youtube-sr'
import ytdl from '@distube/ytdl-core'
import {instagramGetUrl} from 'instagram-url-direct'
import { getFbVideoInfo } from 'fb-downloader-scrapper'
import Tiktok from '@tobyg74/tiktok-api-dl'
import axios from 'axios'

const yt_agent = ytdl.createAgent([{name: 'cookie1', value: 'GPS=1; YSC=CkypMSpfgiI; VISITOR_INFO1_LIVE=4nF8vxPW1gU; VISITOR_PRIVACY_METADATA=CgJCUhIEGgAgZA%3D%3D; PREF=f6=40000000&tz=America.Sao_Paulo; SID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbH4SZC5IHPqi_QBmSiigPHAACgYKAYgSARASFQHGX2Mi3N21zLYOMAku61_CaeccrxoVAUF8yKo3X97N4REFyHP4du4RIo1b0076; __Secure-1PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-3PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-1PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbYpnHl6jq9y45aoBaqMd96QACgYKAR4SARASFQHGX2MiqFuOgRtuIS_FKmulaCrckxoVAUF8yKpX5r8ISh5S5eQ4eofBuyCg0076; __Secure-3PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDb_8Q3teG8nn23ceeF8jiOvwACgYKAY0SARASFQHGX2MiwBtnenbu4CRMpjQza-asfhoVAUF8yKoFXx_Zxl4MvxGnWSSsnv1z0076; HSID=AWgIQn3iifuaU_eRW; SSID=AR8Jlj2XTnPAmL5kf; APISID=l6PTqM9Dy8G_2E6P/A-sAusHOyG1pQ3T75; SAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-1PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-3PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; LOGIN_INFO=AFmmF2swRQIgShGx2tfQkQV4F8lyKnh4mwj54yTOPJqEdI44sDTtsrwCIQD870Le1gTMDFpz7rRHS6Fk0HzraG_SxHw_PdyLjUDXxg:QUQ3MjNmeVpqbVhSQlNCMnFFZXBKQkhCTHJxY1NXOVlYcG50SHNNOGxGZGZ3Z2ZobWwyOW95WGJ2LVplelNaZ0RfbGU3Tm1uYktDdHBnVm9fd3N3T0NncVpTN0ZaNlRoTTVETDJHSjV6QkxUWmdYWGx0eVFYeEFqa0gxUGdBYUJKbG5oQ2pBd3RBb0ROWXBwcFQwYkpBRktEQXlWbmZIbHJB; SIDCC=AKEyXzXkXTftuhPOtObUSCLHxp1byOAtlesMkptSGp8hyE3d97Dvy2UHd4-2ePWBpzUbQhV6; __Secure-1PSIDCC=AKEyXzXlrhkCIONPS4jCvhmtFb8nAKr8fEFCCFEFqN8BKyrw8tKHFh3-r8EWjrqjAKH9Z9fq0A; __Secure-3PSIDCC=AKEyXzWLIbNbh8dxdyKhTafkyKIbEBwVKGR4lNRhhYX5u_v1k4vBnu4eAS9lgpP-JK2PgiSDJw'}])

interface ResObterMidiaTwitter {
    resultado?: {
        texto: string,
        midias: {
            tipo: string,
            url: string
        }[]
    }
    erro?: string
}

export const obterMidiaTwitter = async(url: string)=>{
    return new Promise <ResObterMidiaTwitter> (async (resolve, reject)=>{
        try{
            let resposta : ResObterMidiaTwitter = {} 
            url = url.replace(/twitter\.com|x\.com/g, 'api.vxtwitter.com')

            await axios.get(url).then(({data}) =>{
                resposta.resultado = {
                    texto: data.text,
                    midias:[]
                }

                data.media_extended.forEach((midia : {type: string, url: string})=>{
                    if(midia.type == 'video'){
                        resposta.resultado?.midias.push({
                            tipo : 'video',
                            url : midia.url
                        })
                    } else if(midia.type == 'image'){
                        resposta.resultado?.midias.push({
                            tipo : 'imagem',
                            url : midia.url
                        })
                    }
                })

                resolve(resposta)
            }).catch(()=>{
                resposta.erro = `Houve um erro no servidor de obter mídias do Twitter/X`
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterMidiaTwitter - ${err.message}`)
            reject({erro: `Houve um erro no servidor de obter mídias do Twitter/X`})
        }
    })

}


interface ResObterMidiaTiktok {
    resultado?: {
        autor_perfil: string | undefined,
        descricao: string | undefined,
        tipo: string,
        duracao : number | null,
        url: string | string []
    }
    erro?: string
}

export const obterMidiaTiktok = async(url : string)=>{

    return new Promise <ResObterMidiaTiktok> (async (resolve, reject)=>{
        try{
            let resposta : ResObterMidiaTiktok = {}
            await Tiktok.Downloader(url, {version: "v1"}).then((resultado)=>{
                if(resultado.status == "success"){
                    resposta.resultado = {
                        autor_perfil: resultado.result?.author.nickname,
                        descricao : resultado.result?.description,
                        tipo: resultado.result?.type == "video" ? "video" : "imagem",
                        duracao: resultado.result?.type == "video" ? parseInt(((resultado.result?.video?.duration as number)/1000).toFixed(0)) : null,
                        url: resultado.result?.type == "video" ? resultado.result?.video?.playAddr[0] as string : resultado.result?.images as string[]
                    }
                    resolve(resposta)
                } else {
                    resposta.erro = 'Não foi encontrado resultado para este link, verifique o link.'
                    reject(resposta)
                }
            }).catch(()=>{
                resposta.erro = 'Houve um erro no servidor de download do TikTok.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterMidiaTiktok - ${err.message}`)
            reject({erro: 'Houve um erro no servidor de download do TikTok.'})
        }
    })
}

interface ResObterMidiaFacebook {
    resultado?: any
    erro?: string
}

export const obterMidiaFacebook = async(url : string)=>{
    return new Promise <ResObterMidiaFacebook> (async (resolve,reject)=>{
        try {
            let resposta : ResObterMidiaFacebook = {}
            await getFbVideoInfo(url).then((res: any)=>{
                resposta.resultado = res
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Erro ao obter o video, verifique o link ou tente mais tarde."
                reject(resposta)
            })
        } catch(err : any) {
            console.log(`API obterMidiaFacebook - ${err.message}`)
            reject({erro: "Houve um erro no servidor de download do Facebook."})
        }
    })

}


interface ResObterMidiaInstagram{
    resultado?: {
        tipo: string,
        buffer: Buffer
    }[]
    erro?: string
}

export const obterMidiaInstagram = async(url: string)=>{
    return new Promise <ResObterMidiaInstagram> (async(resolve, reject)=>{
        try{
            let resposta : ResObterMidiaInstagram = {}
            await instagramGetUrl(url).then(async (res : any)=>{
                resposta.resultado = []
                for (const url of res.url_list) {
                    const {data, headers} = await axios.get(url, { responseType: 'arraybuffer' })
                    const buffer = Buffer.from(data, 'utf-8')
                    const tipo = headers['content-type'] == 'video/mp4' ? 'video' : 'imagem'
                    resposta.resultado.push({tipo, buffer})
                }
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Erro ao obter o video, verifique o link ou tente mais tarde."
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterMidiaInstagram - ${err.message}`)
            reject({erro: "Houve um erro no servidor de download do Instagram"})
        }
    })

}


interface ResObterInfoVideoYT{
    resultado?: {
        videoId: string,
        title: string,
        shortDescription: string,
        lengthSeconds: string,
        keywords?: string[],
        channelId: string,
        isOwnerViewing: boolean,
        isCrawlable: boolean,
        durationFormatted: string,
        format: ytdl.videoFormat
    }
    erro?: string
}

export const obterInfoVideoYT = async(texto : string)=>{ 
    return new Promise <ResObterInfoVideoYT> (async (resolve, reject)=>{
        try{
            let resposta: ResObterInfoVideoYT = {}, id_video : string = ''
            //Checagem do ID do video
            const URL_VALIDA = ytdl.validateURL(texto)
            if(URL_VALIDA){
                id_video = ytdl.getVideoID(texto)
            } else {
                await Youtube.default.searchOne(texto).then((pesquisaVideo)=>{
                    id_video = pesquisaVideo.id as string
                }).catch(()=>{
                    resposta.erro = 'Houve um erro ao obter as informações do video.'
                    reject(resposta) 
                })
            }
            //Obtendo informações do video
            ytdl.getInfo(id_video, { 
                playerClients: ["WEB", "WEB_EMBEDDED", "ANDROID", "IOS"], 
                agent: yt_agent
            }).then(infovideo=>{
                const formats = ytdl.filterFormats(infovideo.formats, "videoandaudio");
                const format = ytdl.chooseFormat(formats, {quality: 'highest'})
                resposta.resultado = {
                    videoId : infovideo.player_response.videoDetails.videoId,
                    title:  infovideo.player_response.videoDetails.title,
                    shortDescription: infovideo.player_response.videoDetails.shortDescription,
                    lengthSeconds: infovideo.player_response.videoDetails.lengthSeconds,
                    keywords: infovideo.player_response.videoDetails.keywords,
                    channelId: infovideo.player_response.videoDetails.channelId,
                    isOwnerViewing: infovideo.player_response.videoDetails.isOwnerViewing,
                    isCrawlable: infovideo.player_response.videoDetails.isCrawlable,
                    durationFormatted: formatarSegundos(parseInt(infovideo.player_response.videoDetails.lengthSeconds)),
                    format
                } 
                resolve(resposta)                       
            }).catch((err)=>{
                if(err.message == "Status code: 410") resposta.erro = 'O video parece ter restrição de idade ou precisa de ter login para assistir.' 
                else resposta.erro = 'Houve um erro ao obter as informações do video.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterInfoVideoYT - ${err.message}`)
            reject({erro:'Houve um erro no servidor de pesquisas do Youtube.'})
        }
    })
}


interface ResObterYTMP4{
    resultado?: Buffer
    erro?: string
}

export const obterYTMP4 = async(texto : string) =>{
    return new Promise <ResObterYTMP4> (async (resolve, reject)=>{
        try{
            let resposta: ResObterYTMP4 = {}
            let saidaVideo = obterCaminhoTemporario('mp4')
            let {resultado : infoVideo} = await obterInfoVideoYT(texto)
            let videoStream = ytdl(infoVideo?.videoId as string, {format: infoVideo?.format, agent: yt_agent})
            videoStream.pipe(fs.createWriteStream(saidaVideo))
            videoStream.on("end", ()=>{
                let bufferVideo = fs.readFileSync(saidaVideo)
                fs.unlinkSync(saidaVideo)
                resposta.resultado = bufferVideo
                resolve(resposta)
            }).on('error', ()=>{
                resposta.erro = "Erro no servidor para o obter o video do Youtube"
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterYTMP4 - ${err.message}`)
            reject({erro: "Erro no servidor para o obter o video do Youtube"})
        }    
    })
}


interface ResObterYTMP3{
    resultado?: Buffer
    erro?: string
}

export const obterYTMP3 = async(texto : string)=>{
    return new Promise <ResObterYTMP3> (async (resolve, reject)=>{
        try{
            let resposta : ResObterYTMP3 = {}
            let {resultado : bufferVideo} = await obterYTMP4(texto)
            let {resultado : bufferAudio} = await converterMp4ParaMp3(bufferVideo as Buffer)
            resposta.resultado = bufferAudio
            resolve(resposta)
        } catch(err : any){
            console.log(`API obterYTMP3 - ${err.message}`)
            reject({erro: "Erro na conversão para o obter o MP3 do Youtube"})
        }
    })
}

