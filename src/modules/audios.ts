import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import {obterCaminhoTemporario} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import duration from 'format-duration-time'
import {createClient, SyncPrerecordedResponse} from '@deepgram/sdk'
import tts from 'node-gtts'
import {fileTypeFromBuffer, FileTypeResult} from 'file-type'
import axios, { AxiosRequestConfig } from 'axios'
import FormData from 'form-data'

interface ResTextoParaVoz {
    resultado?: Buffer,
    erro?: string
}

export const textoParaVoz = async (idioma: string, texto: string)=>{
    return new Promise <ResTextoParaVoz> ((resolve,reject)=>{
        try{
            let caminhoAudio =  obterCaminhoTemporario("mp3")
            let resposta : ResTextoParaVoz = {}
            tts(idioma).save(caminhoAudio, texto, ()=>{
                let bufferAudio = fs.readFileSync(caminhoAudio)
                fs.unlinkSync(caminhoAudio)
                resposta.resultado = bufferAudio
                resolve(resposta)
            })
        } catch(err : any){
            console.log(`API textoParaVoz - ${err.message}`)
            reject({erro: "Erro na conversão de texto para voz."})
        } 
    })
}

interface ResObterTranscricaoAudio {
    resultado?: SyncPrerecordedResponse,
    erro?: string
}

export const obterTranscricaoAudio = async (bufferAudio : Buffer, {deepgram_secret_key} : {deepgram_secret_key : string})=>{
    return new Promise <ResObterTranscricaoAudio> (async (resolve, reject)=>{
        try{
            let resposta: ResObterTranscricaoAudio = {}
            if(!deepgram_secret_key){
                resposta.erro = "A chave do DEEPGRAM não foi inserida corretamente."
                reject(resposta)
            }
            const deepgram = createClient(deepgram_secret_key)
            const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
                bufferAudio,
                {
                    model: 'nova-2',
                    language: 'pt-BR',
                    smart_format: true, 
                },
            )
    
            if(error){
                resposta.erro = "Erro no servidor para obter a transcrição do áudio"
                reject(resposta)
            } else {
                resposta.resultado = result
                resolve(resposta)
            }
        } catch(err : any){
            console.log(`API obterTranscriçãoAudio - ${err.message}`)
            reject({erro: "Erro no servidor para obter a transcrição do áudio."})
        }
    })
}

interface ResObterAudioModificado {
    resultado?: Buffer
    erro?: string
}

export const obterAudioModificado = async (bufferAudio: Buffer, tipo: "estourar" | "reverso" | "grave" | "agudo" | "x2" | "volume") =>{
    return new Promise <ResObterAudioModificado> ((resolve,reject)=>{
        try{
            let resposta : ResObterAudioModificado = {}
            let caminhoAudio = obterCaminhoTemporario('mp3')
            let saidaAudio = obterCaminhoTemporario('mp3')
            let ffmpegOpcoes : any[] = []
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
                    resposta.erro = `Esse tipo de edição não é suportado`
                    reject(resposta)
            }
            
            ffmpeg(caminhoAudio).outputOptions(ffmpegOpcoes).save(saidaAudio)
            .on('end', async () => {
                let bufferAudioEditado = fs.readFileSync(saidaAudio)
                fs.unlinkSync(caminhoAudio)
                fs.unlinkSync(saidaAudio)
                resposta.resultado = bufferAudioEditado
                resolve(resposta)
            })
            .on("error", ()=>{
                fs.unlinkSync(caminhoAudio)
                resposta.erro = `Houve um erro na modificação do áudio`
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterAudioModificado - ${err.message}`)
            reject({erro: `Houve um erro na modificação do áudio`})
        }
    })
}

interface ResObterReconhecimentoMusica {
    resultado?: {
        produtora : string,
        duracao: string,
        lancamento: string,
        album: string,
        titulo: string,
        artistas: string
    }
    erro?: string
}

export const obterReconhecimentoMusica = async (bufferMidia : Buffer, {acr_host , acr_access_key, acr_access_secret}: {acr_host: string, acr_access_key: string, acr_access_secret: string}) =>{
    return new Promise <ResObterReconhecimentoMusica> (async (resolve, reject)=>{
        try{
            let resposta : ResObterReconhecimentoMusica = {}
            let {mime: tipoArquivo} = await fileTypeFromBuffer(bufferMidia) as FileTypeResult
            let bufferAudio : Buffer | null = null

            if(!acr_host || !acr_access_key || !acr_access_secret){
                resposta.erro = 'As chaves do ACRCloud não foram inseridas corretamente'
                reject(resposta)
            }

            let formData = new FormData()
            formData.append('host', acr_host?.trim())
            formData.append('access_key', acr_access_key?.trim())
            formData.append('access_secret', acr_access_secret?.trim())
            formData.append('data_type', 'fingerprint')

            if(tipoArquivo.startsWith('video') || tipoArquivo.startsWith('audio')){
                if(tipoArquivo.startsWith('video')) bufferAudio = (await converterMp4ParaMp3(bufferMidia)).resultado as Buffer
                if(tipoArquivo.startsWith('audio')) bufferAudio = bufferMidia
                formData.append('sample', bufferAudio, {filename: 'audio.mp3'})
                let config : AxiosRequestConfig = {
                    url: 'https://identify-eu-west-1.acrcloud.com/v1/identify',
                    method: 'POST',
                    data: formData
                }
                const {data} = await axios.request(config)
                if(data.status.code == 1001) {
                    resposta.erro = 'Não foi encontrada uma música compatível.'
                    reject(resposta)
                }
                if(data.status.code == 3003 || data.status.code == 3015){
                    resposta.erro = 'Você excedeu o limite do ACRCloud, crie uma nova chave no site'
                    reject(resposta)
                } 
                if(data.status.code == 3000){
                    resposta.erro = 'Houve um erro no servidor do ACRCloud, tente novamente mais tarde'
                    reject(resposta)
                }
                let arrayDataLancamento = data.metadata.music[0].release_date.split("-")
                let artistas = []
                for(let artista of data.metadata.music[0].artists){
                    artistas.push(artista.name)
                }
                resposta.resultado = {
                    produtora : data.metadata.music[0].label || "-----",
                    duracao: duration.default(data.metadata.music[0].duration_ms).format("m:ss"),
                    lancamento: `${arrayDataLancamento[2]}/${arrayDataLancamento[1]}/${arrayDataLancamento[0]}`,
                    album: data.metadata.music[0].album.name,
                    titulo: data.metadata.music[0].title,
                    artistas: artistas.toString()
                }
                resolve(resposta)
            } else {
                resposta.erro = 'Esse tipo de mensagem não é suportado.'
                reject(resposta)
            }
        } catch(err : any){
            console.log(`API obterReconhecimentoMusica - ${err.message}`)
            reject({erro: 'Erro na conexão com a API ACRCloud ou sua chave ainda não está configurada para usar este comando.'})
        }
    })
}

