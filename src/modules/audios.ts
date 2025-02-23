import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import {obterCaminhoTemporario} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import duration from 'format-duration-time'
import {createClient} from '@deepgram/sdk'
import tts from 'node-gtts'
import {fileTypeFromBuffer, FileTypeResult} from 'file-type'
import axios, { AxiosRequestConfig } from 'axios'
import FormData from 'form-data'


export function textoParaVoz (idioma: string, texto: string){
    return new Promise <Buffer> ((resolve)=>{
        let caminhoAudio =  obterCaminhoTemporario("mp3")
        tts(idioma).save(caminhoAudio, texto, ()=>{
            let bufferAudio = fs.readFileSync(caminhoAudio)
            fs.unlinkSync(caminhoAudio)
            resolve(bufferAudio)
        })
    })
}

export function obterTranscricaoAudio (bufferAudio : Buffer, {deepgram_secret_key} : {deepgram_secret_key : string}){
    return new Promise <string> (async (resolve)=>{
        const deepgram = createClient(deepgram_secret_key)
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            bufferAudio,
            {
                model: 'nova-2',
                language: 'pt-BR',
                smart_format: true, 
            },
        )
        if(error) throw new Error("Erro ao obter a transcrição do áudio, use outro aúdio ou tente novamente mais tarde.")
        else resolve(result.results.channels[0].alternatives[0].transcript)
    })
}

export function obterAudioModificado (bufferAudio: Buffer, tipo: "estourar" | "reverso" | "grave" | "agudo" | "x2" | "volume"){
    return new Promise <Buffer> ((resolve)=>{
        let caminhoAudio = obterCaminhoTemporario('mp3')
        let saidaAudio = obterCaminhoTemporario('mp3')
        let ffmpegOpcoes : string[] = []
        fs.writeFileSync(caminhoAudio, bufferAudio)
        switch(tipo){
            case "estourar":
                ffmpegOpcoes = ["-y", "-filter_complex", "acrusher=level_in=3:level_out=5:bits=10:mode=log:aa=1"] 
                break
            case "reverso":
                ffmpegOpcoes = ["-y", "-filter_complex", "areverse"]
                break
            case "grave":
                ffmpegOpcoes = ["-y", "-af", "asetrate=44100*0.8"]
                break
            case "agudo":
                ffmpegOpcoes = ["-y", "-af", "asetrate=44100*1.4"]
                break
            case "x2":
                ffmpegOpcoes = ["-y", "-filter:a", "atempo=2.0", "-vn"]
                break
            case "volume":
                ffmpegOpcoes = ["-y", "-filter:a", "volume=4.0"]
                break
            default:
                fs.unlinkSync(caminhoAudio)
                throw new Error(`Esse tipo de edição não é suportado`)
        }
        
        ffmpeg(caminhoAudio).outputOptions(ffmpegOpcoes).save(saidaAudio)
        .on('end', async () => {
            let bufferAudioEditado = fs.readFileSync(saidaAudio)
            fs.unlinkSync(caminhoAudio)
            fs.unlinkSync(saidaAudio)
            resolve(bufferAudioEditado)
        })
        .on("error", ()=>{
            fs.unlinkSync(caminhoAudio)
            throw new Error("Houve um erro na conversão de áudio, use outro áudio ou tente novamente mais tarde.")
        })
    })
}

interface InfoReconhecimentoMusica {
    produtora : string,
    duracao: string,
    lancamento: string,
    album: string,
    titulo: string,
    artistas: string
}

export function obterReconhecimentoMusica (bufferMidia : Buffer, {acr_host , acr_access_key, acr_access_secret}: {acr_host: string, acr_access_key: string, acr_access_secret: string}){
    return new Promise <InfoReconhecimentoMusica> (async (resolve)=>{
        let {mime: tipoArquivo} = await fileTypeFromBuffer(bufferMidia) as FileTypeResult
        let bufferAudio : Buffer | undefined

        let formData = new FormData()
        formData.append('host', acr_host?.trim())
        formData.append('access_key', acr_access_key?.trim())
        formData.append('access_secret', acr_access_secret?.trim())
        formData.append('data_type', 'fingerprint')

        if(tipoArquivo.startsWith('video') || tipoArquivo.startsWith('audio')){
            if(tipoArquivo.startsWith('video')) bufferAudio = await converterMp4ParaMp3(bufferMidia)
            if(tipoArquivo.startsWith('audio')) bufferAudio = bufferMidia
            formData.append('sample', bufferAudio, {filename: 'audio.mp3'})
            let config : AxiosRequestConfig = {
                url: 'https://identify-eu-west-1.acrcloud.com/v1/identify',
                method: 'POST',
                data: formData
            }
            const {data} = await axios.request(config)
            if(data.status.code == 1001) {
                throw new Error('Não foi encontrada uma música compatível.')
            }
            if(data.status.code == 3003 || data.status.code == 3015){
                throw new Error("Você excedeu o limite do ACRCloud, crie uma nova chave no site")
            } 
            if(data.status.code == 3000){
                throw new Error('Houve um erro no servidor do ACRCloud, tente novamente mais tarde')
            }
            let arrayDataLancamento = data.metadata.music[0].release_date.split("-")
            let artistas = []
            for(let artista of data.metadata.music[0].artists){
                artistas.push(artista.name)
            }
            resolve({
                produtora : data.metadata.music[0].label || "-----",
                duracao: duration.default(data.metadata.music[0].duration_ms).format("m:ss"),
                lancamento: `${arrayDataLancamento[2]}/${arrayDataLancamento[1]}/${arrayDataLancamento[0]}`,
                album: data.metadata.music[0].album.name,
                titulo: data.metadata.music[0].title,
                artistas: artistas.toString()
            })
        } else {
            throw new Error('Esse tipo de arquivo não é suportado.')
        }
    })
}

