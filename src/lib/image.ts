import axios from 'axios'
import {getRandomFilename} from './util.js'
import duration from 'format-duration-time'
import google from '@victorsouzaleal/googlethis'
import FormData from 'form-data'
import getEmojiMixUrl, {checkSupported} from 'emoji-mixer'
import {ImageUploadService} from 'node-upload-images'
import { AnimeRecognition, ImageSearch } from './interfaces.js'

export function uploadImage(imageBuffer : Buffer){
    return new Promise <string> ((resolve)=>{
        const service = new ImageUploadService('pixhost.to')
        service.uploadFromBinary(imageBuffer, getRandomFilename("png")).then(({directLink})=>{
            resolve(directLink)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de upload da imagem.")
        })
    })
}

export function emojiMix(emoji1: string, emoji2: string){
    return new Promise <Buffer> ((resolve)=>{
        const isSupportedEmoji1  = checkSupported(emoji1, true)
        const isSupportedEmoji2  = checkSupported(emoji2, true)

        if(!isSupportedEmoji1) 
            throw new Error(`${emoji1} não é válido para a união.`)
        if(!isSupportedEmoji2 && isSupportedEmoji1) 
            throw new Error(`${emoji2} não é válido para a união`)
        if(!isSupportedEmoji2 && !isSupportedEmoji1) 
            throw new Error(`${emoji1} e ${emoji2} não são válidos para a união.`)

        const emojiUrl = getEmojiMixUrl(emoji1, emoji2, false, true)

        if(!emojiUrl) {
            throw new Error("Emojis não compatíveis para união")
        }
            
        axios.get(emojiUrl, {responseType: 'arraybuffer'}).then(({data})=>{
            resolve(data)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de download de emojis.")
        }) 
    })
}

export function removeBackground(imageBuffer: Buffer){
    return new Promise <Buffer> (async (resolve)=>{
        const URL_BASE_UPLOAD_IMAGE = 'https://download1.imageonline.co/ajax_upload_file.php'
        const URL_BASE_REMOVE_BG = 'https://download1.imageonline.co/pngmaker.php'
        const uploadFileName = getRandomFilename("png")
        const formDataUpload = new FormData();
        formDataUpload.append('files', imageBuffer, {filename: uploadFileName})
        
        const configUpload = {
            method: 'post',
            maxBodyLength: Infinity,
            url: URL_BASE_UPLOAD_IMAGE,
            headers: { 
                'User-Agent': ' Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', 
                'Accept': ' */*', 
                'Origin': ' https://imageonline.co', 
                'Connection': ' keep-alive', 
                'Referer': ' https://imageonline.co/', 
                'Sec-Fetch-Dest': ' empty', 
                'Sec-Fetch-Mode': ' cors', 
                'Sec-Fetch-Site': ' same-site', 
                ...formDataUpload.getHeaders()
            },
            data : formDataUpload
        }

        const uploadResponse = await axios.request(configUpload).catch(()=>{
            throw new Error("Houve um erro no servidor de upload.")
        })
        const uploadData = JSON.parse(JSON.stringify(uploadResponse.data))

        if(!uploadData.isSuccess){
            throw new Error("Tamanho da foto excedeu o limite")
        } 
            
        const formDataRemoveBg = new FormData()
        formDataRemoveBg.append('name', uploadData.files[0].name)
        formDataRemoveBg.append('originalname', uploadData.files[0].old_name)
        formDataRemoveBg.append('option3', uploadData.files[0].extension)
        formDataRemoveBg.append('option4', '1')

        const configRemoveBg = {
            method: 'post',
            maxBodyLength: Infinity,
            url: URL_BASE_REMOVE_BG,
            headers: { 
            'User-Agent': ' Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', 
            'Accept': ' */*', 
            'Origin': ' https://imageonline.co', 
            'Connection': ' keep-alive', 
            'Referer': ' https://imageonline.co/', 
            'Sec-Fetch-Dest': ' empty', 
            'Sec-Fetch-Mode': ' cors', 
            'Sec-Fetch-Site': ' same-site'
            },
            data : formDataRemoveBg
        }

        const responseRemoveBackground = await axios.request(configRemoveBg).catch(()=>{
            throw new Error("Houve um erro no servidor de remover o fundo.")
        })

        const pictureUrl = responseRemoveBackground.data.match(/https:\/\/download1\.imageonline\.co\/download\.php\?filename=[A-Za-z0-9]+-imageonline\.co-[0-9]+\.png/m)[0]
        const {data: imageBufferRemovedBg} = await axios.get(pictureUrl, {responseType: 'arraybuffer'}).catch(()=>{
            throw new Error("Houve erro ao tentar baixar a imagem sem fundo.")
        })
        resolve(imageBufferRemovedBg)
    })
}

export function animeRecognition(imageBuffer : Buffer){ 
    return new Promise <AnimeRecognition> ((resolve)=>{
        const URL_BASE = 'https://api.trace.moe/search?anilistInfo'
        fetch(URL_BASE,{
            method: "POST",
            body: imageBuffer,
            headers: { "Content-type": "image/jpeg" },
        }).then(async (res)=>{
            const data : {result: any[]} = await res.json()
            const msInitial = Math.round(data.result[0].from * 1000) 
            const msFinal = Math.round(data.result[0].to * 1000)
            resolve({
                initial_time : duration.default(msInitial).format("h:mm:ss"),
                final_time: duration.default(msFinal).format("h:mm:ss"),
                episode: data.result[0].episode,
                title: data.result[0].anilist.title.english || data.result[0].anilist.title.romaji,
                similarity: (data.result[0].similarity * 100).toFixed(2),
                preview_url: data.result[0].video
            })
        }).catch(err =>{
            if(err.status == 429){
                throw new Error('Muitas solicitações sendo feitas, tente novamente mais tarde.')
            } else if(err.status == 400){
                throw new Error('Não foi possível achar resultados para esta imagem')
            } else {
                throw new Error('Houve um erro no servidor de pesquisa de anime.')
            } 
        })
    })
}

export function imageSearchGoogle(text: string){
    return new Promise <ImageSearch[]> ((resolve)=>{
        google.image(text, { safe: false, additional_params:{hl: 'pt'}}).then((images)=>{
            if(!images.length){
                throw new Error("Nenhum resultado foi encontrado para esta pesquisa.")
            } 
                
            let imagesResult : ImageSearch[] = []
            for (let image of images){
                if(image.preview) 
                    imagesResult.push(image)
            }

            resolve(imagesResult)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de pesquisa de imagens, ou não há resultados para essa pesquisa.")
        })
    })
}