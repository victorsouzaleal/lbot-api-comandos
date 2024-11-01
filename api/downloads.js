import fs from 'fs-extra'
import {obterCaminhoTemporario, formatarSegundos} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import Youtube from 'youtube-sr'
import ytdl from '@distube/ytdl-core'
import instagramGetUrl from 'instagram-url-direct'
import getFbVideoInfo from 'fb-downloader-scrapper'
import Tiktok from '@tobyg74/tiktok-api-dl'
import {TwitterDL} from 'twitter-downloader'
import axios from 'axios'

const yt_agent = ytdl.createAgent([{name: 'cookie1', value: 'GPS=1; YSC=CkypMSpfgiI; VISITOR_INFO1_LIVE=4nF8vxPW1gU; VISITOR_PRIVACY_METADATA=CgJCUhIEGgAgZA%3D%3D; PREF=f6=40000000&tz=America.Sao_Paulo; SID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbH4SZC5IHPqi_QBmSiigPHAACgYKAYgSARASFQHGX2Mi3N21zLYOMAku61_CaeccrxoVAUF8yKo3X97N4REFyHP4du4RIo1b0076; __Secure-1PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-3PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-1PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbYpnHl6jq9y45aoBaqMd96QACgYKAR4SARASFQHGX2MiqFuOgRtuIS_FKmulaCrckxoVAUF8yKpX5r8ISh5S5eQ4eofBuyCg0076; __Secure-3PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDb_8Q3teG8nn23ceeF8jiOvwACgYKAY0SARASFQHGX2MiwBtnenbu4CRMpjQza-asfhoVAUF8yKoFXx_Zxl4MvxGnWSSsnv1z0076; HSID=AWgIQn3iifuaU_eRW; SSID=AR8Jlj2XTnPAmL5kf; APISID=l6PTqM9Dy8G_2E6P/A-sAusHOyG1pQ3T75; SAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-1PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-3PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; LOGIN_INFO=AFmmF2swRQIgShGx2tfQkQV4F8lyKnh4mwj54yTOPJqEdI44sDTtsrwCIQD870Le1gTMDFpz7rRHS6Fk0HzraG_SxHw_PdyLjUDXxg:QUQ3MjNmeVpqbVhSQlNCMnFFZXBKQkhCTHJxY1NXOVlYcG50SHNNOGxGZGZ3Z2ZobWwyOW95WGJ2LVplelNaZ0RfbGU3Tm1uYktDdHBnVm9fd3N3T0NncVpTN0ZaNlRoTTVETDJHSjV6QkxUWmdYWGx0eVFYeEFqa0gxUGdBYUJKbG5oQ2pBd3RBb0ROWXBwcFQwYkpBRktEQXlWbmZIbHJB; SIDCC=AKEyXzXkXTftuhPOtObUSCLHxp1byOAtlesMkptSGp8hyE3d97Dvy2UHd4-2ePWBpzUbQhV6; __Secure-1PSIDCC=AKEyXzXlrhkCIONPS4jCvhmtFb8nAKr8fEFCCFEFqN8BKyrw8tKHFh3-r8EWjrqjAKH9Z9fq0A; __Secure-3PSIDCC=AKEyXzWLIbNbh8dxdyKhTafkyKIbEBwVKGR4lNRhhYX5u_v1k4vBnu4eAS9lgpP-JK2PgiSDJw'}])


export const obterMidiaTwitter = async(url)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {} 
            await TwitterDL(url).then(res=>{
                if(res.status != 'success') {
                    resposta.erro = `Houve um erro ao baixar essa mídia, provavelmente é um conteúdo sensivel.`
                    reject(resposta)
                }

                resposta.resultado = {
                    texto: res.result.description,
                    midias:[]
                }

                res.result.media.forEach((midia)=>{
                    if(midia.type == 'video'){
                        resposta.resultado.midias.push({
                            tipo : 'video',
                            url : midia.videos.length > 1 ? midia.videos[1].url : midia.videos[0].url
                        })
                    } else if(midia.type == 'photo'){
                        resposta.resultado.midias.push({
                            tipo : 'imagem',
                            url : midia.image
                        })
                    }
                })
                
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = `Houve um erro no servidor de obter mídias do Twitter/X`
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterMidiaTwitter - ${err.message}`)
            reject({erro: `Houve um erro no servidor de obter mídias do Twitter/X`})
        }
    })

}

export const obterMidiaTiktok = async(url)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            await Tiktok.Downloader(url, {version: "v2"}).then((resultado)=>{
                if(resultado.status == "success"){
                    resposta.resultado = {
                        autor_perfil: resultado.result?.author.nickname,
                        descricao : resultado.result?.desc,
                        //duracao: ((resultado.result.video.duration)/1000).toFixed(0),
                        url: resultado.result?.video || resultado.result?.images[0]
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
        } catch(err){
            console.log(`API obterMidiaTiktok - ${err.message}`)
            reject({erro: 'Houve um erro no servidor de download do TikTok.'})
        }
    })
}

export const obterMidiaFacebook = async(url)=>{
    return new Promise(async (resolve,reject)=>{
        try {
            let resposta = {}
            await getFbVideoInfo(url).then(res=>{
                resposta.resultado = res
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Erro ao obter o video, verifique o link ou tente mais tarde."
                reject(resposta)
            })
        } catch(err) {
            console.log(`API obterMidiaFacebook - ${err.message}`)
            reject({erro: "Houve um erro no servidor de download do Facebook."})
        }
    })

}

export const obterMidiaInstagram = async(url)=>{
    return new Promise(async(resolve, reject)=>{
        try{
            let resposta = {}
            await instagramGetUrl(url).then(async (res)=>{
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
        } catch(err){
            console.log(`API obterMidiaInstagram - ${err.message}`)
            reject({erro: "Houve um erro no servidor de download do Instagram"})
        }
    })

}

export const obterInfoVideoYT = async(texto)=>{ 
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}, id_video = ''
            //Checagem do ID do video
            const URL_VALIDA = ytdl.validateURL(texto)
            if(URL_VALIDA){
                id_video = ytdl.getVideoID(texto)
            } else {
                await Youtube.default.searchOne(texto).then((pesquisaVideo)=>{
                    id_video = pesquisaVideo.id
                }).catch(()=>{
                    resposta.erro = 'Houve um erro ao obter as informações do video.'
                    reject(resposta) 
                })
            }
            //Obtendo informações do video
            ytdl.getInfo(id_video, { 
                playerClients: ["IOS", "WEB_CREATOR", "ANDROID", "WEB"], 
                agent: yt_agent
            }).then(infovideo=>{
                const formats = ytdl.filterFormats(infovideo.formats, "videoandaudio");
                const format = ytdl.chooseFormat(formats, {quality: 'highest'})
                resposta.resultado = infovideo.player_response.videoDetails
                resposta.resultado.durationFormatted = formatarSegundos(infovideo.player_response.videoDetails.lengthSeconds)
                resposta.resultado.format = format
                resolve(resposta)                       
            }).catch((err)=>{
                if(err.message == "Status code: 410") resposta.erro = 'O video parece ter restrição de idade ou precisa de ter login para assistir.' 
                else resposta.erro = 'Houve um erro ao obter as informações do video.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterInfoVideoYT - ${err.message}`)
            reject({erro:'Houve um erro no servidor de pesquisas do Youtube.'})
        }
    })
}

export const obterYTMP3 = async(texto)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            let {resultado : bufferVideo} = await obterYTMP4(texto)
            let {resultado : bufferAudio} = await converterMp4ParaMp3(bufferVideo)
            resposta.resultado = bufferAudio
            resolve(resposta)
        } catch(err){
            console.log(`API obterYTMP3 - ${err.message}`)
            reject({erro: "Erro na conversão para o obter o MP3 do Youtube"})
        }
    })
}

export const obterYTMP4 = async(texto) =>{
    return new Promise (async (resolve, reject)=>{
        try{
            let resposta = {}
            let saidaVideo = obterCaminhoTemporario('mp4')
            let {resultado : infoVideo} = await obterInfoVideoYT(texto)
            let videoStream = ytdl(infoVideo.videoId, {format: infoVideo.format, agent: yt_agent})
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
        } catch(err){
            console.log(`API obterYTMP4 - ${err.message}`)
            reject({erro: "Erro no servidor para o obter o video do Youtube"})
        }    
    })
}