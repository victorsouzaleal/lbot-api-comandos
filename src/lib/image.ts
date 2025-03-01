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
        let isSupportedEmoji1  = checkSupported(emoji1, true), isSupportedEmoji2  = checkSupported(emoji2, true)

        if(!isSupportedEmoji1) 
            throw new Error(`${emoji1} não é válido para a união.`)
        if(!isSupportedEmoji2 && isSupportedEmoji1) 
            throw new Error(`${emoji2} não é válido para a união`)
        if(!isSupportedEmoji2 && !isSupportedEmoji1) 
            throw new Error(`${emoji1} e ${emoji2} não são válidos para a união.`)

        let emojiUrl = getEmojiMixUrl(emoji1, emoji2, false, true)
        if(!emojiUrl) 
            throw new Error("Emojis não compatíveis para união")
        axios.get(emojiUrl, {responseType: 'arraybuffer'}).then(({data})=>{
            resolve(data)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de download de emojis.")
        }) 
    })
}

export function removeBackground(imageBuffer: Buffer){
    return new Promise <Buffer> (async (resolve)=>{
        //Upload da imagem
        let uploadFileName = getRandomFilename("png")
        let formDataUpload = new FormData();
        formDataUpload.append('files', imageBuffer, {filename: uploadFileName})

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://download1.imageonline.co/ajax_upload_file.php',
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

        let uploadResponse = await axios.request(config).catch(()=>{
            throw new Error("Houve um erro no servidor de upload.")
        })

        let uploadData = JSON.parse(JSON.stringify(uploadResponse.data))
        if(!uploadData.isSuccess) 
            throw new Error("Tamanho da foto excedeu o limite")

        // Remoção de fundo
        let formDataRemove = new FormData()
        formDataRemove.append('name', uploadData.files[0].name)
        formDataRemove.append('originalname', uploadData.files[0].old_name)
        formDataRemove.append('option3', uploadData.files[0].extension)
        formDataRemove.append('option4', '1')

        
        config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://download1.imageonline.co/pngmaker.php',
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
            data : formDataRemove
        }

        let responseRemoveBackground = await axios.request(config).catch(()=>{
            throw new Error("Houve um erro no servidor de remover o fundo.")
        })

        let pictureUrl = responseRemoveBackground.data.match(/https:\/\/download1\.imageonline\.co\/download\.php\?filename=[A-Za-z0-9]+-imageonline\.co-[0-9]+\.png/m)[0]
        let {data: imageBufferRemovedBg} = await axios.get(pictureUrl, {responseType: 'arraybuffer'}).catch(()=>{
            throw new Error("Houve erro ao tentar baixar a imagem sem fundo.")
        })
        resolve(imageBufferRemovedBg)
    })
}

export function animeRecognition(imageBuffer : Buffer){ 
    return new Promise <AnimeRecognition> ((resolve)=>{
        fetch(`https://api.trace.moe/search?anilistInfo`,{
            method: "POST",
            body: imageBuffer,
            headers: { "Content-type": "image/jpeg" },
        }).then(async (res)=>{
            let data : {result: any[]} = await res.json()
            let msInitial = Math.round(data.result[0].from * 1000) 
            let msFinal = Math.round(data.result[0].to * 1000)
            resolve({
                initial_time : duration.default(msInitial).format("h:mm:ss"),
                final_time: duration.default(msFinal).format("h:mm:ss"),
                episode: data.result[0].episode,
                title: data.result[0].anilist.title.english || data.result[0].anilist.title.romaji,
                similarity: (data.result[0].similarity * 100).toFixed(2),
                preview_url: data.result[0].video
            })
        }).catch(err =>{
            if(err.status == 429) 
                throw new Error('Muitas solicitações sendo feitas, tente novamente mais tarde.')
            else if(err.status == 400) 
                throw new Error('Não foi possível achar resultados para esta imagem')
            else
                throw new Error('Houve um erro no servidor de pesquisa de anime.')
        })
    })
}

export function imageSearchGoogle(text: string){
    return new Promise <ImageSearch[]> ((resolve)=>{
        google.image(text, { safe: false, additional_params:{hl: 'pt'}}).then((images)=>{
            if(!images.length) 
                throw new Error("Nenhum resultado foi encontrado para esta pesquisa.")
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