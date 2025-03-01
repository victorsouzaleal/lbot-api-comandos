import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import {getTempPath} from './util.js'
import {convertMP4ToMP3} from './video.js'
import duration from 'format-duration-time'
import {createClient} from '@deepgram/sdk'
import tts from 'node-gtts'
import {fileTypeFromBuffer, FileTypeResult} from 'file-type'
import axios, { AxiosRequestConfig } from 'axios'
import FormData from 'form-data'
import { AudioModificationType, MusicRecognition } from './interfaces.js'


export function textToVoice (lang: string, text: string){
    return new Promise <Buffer> ((resolve)=>{
        const audioPath =  getTempPath("mp3")
        tts(lang).save(audioPath, text, ()=>{
            const audioBuffer = fs.readFileSync(audioPath)
            fs.unlinkSync(audioPath)
            resolve(audioBuffer)
        })
    })
}

export function audioTranscription (audioBuffer : Buffer, {deepgram_secret_key} : {deepgram_secret_key : string}){
    return new Promise <string> (async (resolve)=>{
        const deepgram = createClient(deepgram_secret_key)
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                model: 'nova-2',
                language: 'pt-BR',
                smart_format: true, 
            },
        )

        if(error) {
            throw new Error("Erro ao obter a transcrição do áudio, use outro aúdio ou tente novamente mais tarde.")
        } else {
            resolve(result.results.channels[0].alternatives[0].transcript)
        }
    })
}

export function audioModified (audioBuffer: Buffer, type: AudioModificationType){
    return new Promise <Buffer> ((resolve)=>{
        const inputAudioPath = getTempPath('mp3')
        const outputAudioPath = getTempPath('mp3')
        let options : string[] = []
        fs.writeFileSync(inputAudioPath, audioBuffer)

        switch(type){
            case "estourar":
                options = ["-y", "-filter_complex", "acrusher=level_in=3:level_out=5:bits=10:mode=log:aa=1"] 
                break

            case "reverso":
                options = ["-y", "-filter_complex", "areverse"]
                break

            case "grave":
                options = ["-y", "-af", "asetrate=44100*0.8"]
                break

            case "agudo":
                options = ["-y", "-af", "asetrate=44100*1.4"]
                break

            case "x2":
                options = ["-y", "-filter:a", "atempo=2.0", "-vn"]
                break

            case "volume":
                options = ["-y", "-filter:a", "volume=4.0"]
                break

            default:
                fs.unlinkSync(inputAudioPath)
                throw new Error(`Esse tipo de edição não é suportado`)
        }
        
        ffmpeg(inputAudioPath).outputOptions(options).save(outputAudioPath)
        .on('end', async () => {
            const bufferModifiedAudio = fs.readFileSync(outputAudioPath)
            fs.unlinkSync(inputAudioPath)
            fs.unlinkSync(outputAudioPath)
            resolve(bufferModifiedAudio)
        })
        .on("error", ()=>{
            fs.unlinkSync(inputAudioPath)
            throw new Error("Houve um erro na conversão de áudio, use outro áudio ou tente novamente mais tarde.")
        })
    })
}

export function musicRecognition (mediaBuffer : Buffer, {acr_host , acr_access_key, acr_access_secret}: {acr_host: string, acr_access_key: string, acr_access_secret: string}){
    return new Promise <MusicRecognition> (async (resolve)=>{
        const URL_BASE = 'https://identify-eu-west-1.acrcloud.com/v1/identify'
        const {mime} = await fileTypeFromBuffer(mediaBuffer) as FileTypeResult
        
        if(mime.startsWith('video') || mime.startsWith('audio')){
            let audioBuffer : Buffer | undefined

            if(mime.startsWith('video')) {
                audioBuffer = await convertMP4ToMP3(mediaBuffer)
            } else {
                audioBuffer = mediaBuffer
            }

            const formData = new FormData()
            formData.append('host', acr_host?.trim())
            formData.append('access_key', acr_access_key?.trim())
            formData.append('access_secret', acr_access_secret?.trim())
            formData.append('data_type', 'fingerprint')
            formData.append('sample', audioBuffer, {filename: 'audio.mp3'})
            const config : AxiosRequestConfig = {
                url: URL_BASE,
                method: 'POST',
                data: formData
            }
            const {data} = await axios.request(config)

            if(data.status.code == 1001){
                throw new Error('Não foi encontrada uma música compatível.')
            } else if (data.status.code == 3003 || data.status.code == 3015){
                throw new Error("Você excedeu o limite do ACRCloud, crie uma nova chave no site")
            } else if (data.status.code == 3000){
                throw new Error('Houve um erro no servidor do ACRCloud, tente novamente mais tarde')
            }
                
            let arrayReleaseDate = data.metadata.music[0].release_date.split("-")
            let artists : string[] = []

            for(let artist of data.metadata.music[0].artists){
                artists.push(artist.name)
            }

            resolve({
                producer : data.metadata.music[0].label || "-----",
                duration: duration.default(data.metadata.music[0].duration_ms).format("m:ss"),
                release_date: `${arrayReleaseDate[2]}/${arrayReleaseDate[1]}/${arrayReleaseDate[0]}`,
                album: data.metadata.music[0].album.name,
                title: data.metadata.music[0].title,
                artists: artists.toString()
            })
        } else {
            throw new Error('Esse tipo de arquivo não é suportado.')
        }
    })
}

