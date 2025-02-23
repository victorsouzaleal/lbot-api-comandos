import axios from 'axios'
import {obterNomeAleatorio} from '../lib/util.js'
import duration from 'format-duration-time'
import google from '@victorsouzaleal/googlethis'
import FormData from 'form-data'
import getEmojiMixUrl, {checkSupported} from 'emoji-mixer'
import qs from 'node:querystring'
import {ImageUploadService} from 'node-upload-images'


export function imagemUpload(bufferImagem : Buffer){
    return new Promise <string> ((resolve)=>{
        const service = new ImageUploadService('pixhost.to')
        service.uploadFromBinary(bufferImagem, obterNomeAleatorio("png")).then(({directLink})=>{
            resolve(directLink)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de upload da imagem.")
        })
    })
}

export function misturarEmojis(emoji1: string, emoji2: string){
    return new Promise <Buffer> ((resolve)=>{
        let suporteEmoji1  = checkSupported(emoji1, true), suporteEmoji2  = checkSupported(emoji2, true)
        if(!suporteEmoji1) throw new Error(`${emoji1} não é válido para a união.`)
        if(!suporteEmoji2 && suporteEmoji1) throw new Error(`${emoji2} não é válido para a união`)
        if(!suporteEmoji2 && !suporteEmoji1) throw new Error(`${emoji1} e ${emoji2} não são válidos para a união.`)

        let emojiUrl = getEmojiMixUrl(emoji1, emoji2, false, true)
        if(!emojiUrl) throw new Error("Emojis não compatíveis para união")
        axios.get(emojiUrl, {responseType: 'arraybuffer'}).then(({data})=>{
            resolve(data)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de download de emojis.")
        }) 
    })
}

export function removerFundo(bufferImagem: Buffer){
    return new Promise <Buffer> (async (resolve)=>{
        //Upload da imagem
        let nomeArquivo = obterNomeAleatorio("png")
        let formDataUpload = new FormData();
        formDataUpload.append('files', bufferImagem, {filename: nomeArquivo})

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

        let respostaUpload = await axios.request(config).catch(()=>{
            throw new Error("Houve um erro no servidor de upload.")
        })

        let dadosUpload = JSON.parse(JSON.stringify(respostaUpload.data))
        if(!dadosUpload.isSuccess) throw new Error("Tamanho da foto excedeu o limite")

        // Remoção de fundo
        let formDataRemove = new FormData()
        formDataRemove.append('name', dadosUpload.files[0].name)
        formDataRemove.append('originalname', dadosUpload.files[0].old_name)
        formDataRemove.append('option3', dadosUpload.files[0].extension)
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

        let respostaFotoUrl = await axios.request(config).catch(()=>{
            throw new Error("Houve um erro no servidor de remover o fundo.")
        })

        let fotoUrl = respostaFotoUrl.data.match(/https:\/\/download1\.imageonline\.co\/download\.php\?filename=[A-Za-z0-9]+-imageonline\.co-[0-9]+\.png/m)
        let {data: bufferImagemSemFundo} = await axios.get(fotoUrl[0], {responseType: 'arraybuffer'}).catch(()=>{
            throw new Error("Houve erro ao tentar baixar a imagem sem fundo.")
        })
        resolve(bufferImagemSemFundo)
    })
}


interface InfoAnimeReconhecimento {
    tempoInicial : string,
    tempoFinal : string,
    episodio : string,
    titulo : string,
    similaridade : string,
    link_previa: string
}

export function obterReconhecimentoAnime(bufferImagem : Buffer){ 
    return new Promise <InfoAnimeReconhecimento> ((resolve)=>{
        fetch(`https://api.trace.moe/search?anilistInfo`,{
            method: "POST",
            body: bufferImagem,
            headers: { "Content-type": "image/jpeg" },
        })
        .then(async (res)=>{
            let data : {result: any[]} = await res.json()
            res = await res.json()
            let msInicio = Math.round(data.result[0].from * 1000) , msFinal = Math.round(data.result[0].to * 1000)
            let tempoInicial = duration.default(msInicio).format("h:mm:ss")
            let tempoFinal = duration.default(msFinal).format("h:mm:ss")
            let episodio = data.result[0].episode
            let titulo =  data.result[0].anilist.title.english || data.result[0].anilist.title.romaji
            let similaridade = (data.result[0].similarity * 100).toFixed(2)
            let previaLink = data.result[0].video
            resolve({
                tempoInicial,
                tempoFinal,
                episodio,
                titulo,
                similaridade,
                link_previa: previaLink
            })
        })
        .catch(err =>{
            if(err.status == 429) throw new Error('Muitas solicitações sendo feitas, tente novamente mais tarde.')
            else if(err.status == 400) throw new Error('Não foi possível achar resultados para esta imagem')
            throw new Error('Houve um erro no servidor de pesquisa de anime.')
        })
    })
}


interface InfoPesquisaImagem {
    id: string,
    url: string,
    width: number,
    height: number,
    color: number,
    preview: {
        url: string,
        width: number,
        height: number,
    },
    origin: {
        title: string,
        website: {
            name: string,
            domain: string,
            url: string,
        }
    }
}

export function obterImagens(texto: string){
    return new Promise <InfoPesquisaImagem[]> ((resolve)=>{
        google.image(texto, { safe: false, additional_params:{hl: 'pt'}}).then((imagens)=>{
            if(imagens.length == 0) throw new Error("Nenhum resultado foi encontrado para esta pesquisa.")
            let resultadoImagens : InfoPesquisaImagem[] = []
            for (let imagem of imagens) if(imagem.preview != undefined) resultadoImagens.push(imagem)
            resolve(resultadoImagens)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de pesquisa de imagens, ou não há resultados para essa pesquisa.")
        })
    })
}