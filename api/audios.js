import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import {obterCaminhoTemporario} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import duration from 'format-duration-time'
import acrcloud from 'acrcloud'
import {createClient} from '@deepgram/sdk'
import tts from 'node-gtts'
import {fileTypeFromBuffer} from 'file-type'


export const textoParaVoz = async (idioma, texto)=>{
    return new Promise((resolve,reject)=>{
        try{
            let caminhoAudio =  obterCaminhoTemporario("mp3")
            let resposta = {sucesso: false}
            tts(idioma).save(caminhoAudio, texto, ()=>{
                let bufferAudio = fs.readFileSync(caminhoAudio)
                fs.unlinkSync(caminhoAudio)
                resposta = {sucesso: true, resultado: bufferAudio}
                resolve(resposta)
            })
        } catch(err){
            console.log(`API textoParaVoz - ${err.message}`)
            reject({sucesso: false, erro: "Erro na conversão de texto para voz."})
        } 
    })
}

export const obterTranscricaoAudio = async (bufferAudio, {deepgram_secret_key})=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            if(!deepgram_secret_key){
                resposta = {sucesso : false, erro: "A chave do DEEPGRAM não foi inserida corretamente."}
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
                resposta = {sucesso : false, erro: "Erro no servidor para obter a transcrição do áudio"}
                reject(resposta)
            } else {
                resposta = {sucesso: true, resultado: result}
                resolve(resposta)
            }
        } catch(err){
            console.log(`API obterTranscriçãoAudio - ${err.message}`)
            reject({sucesso : false, erro: "Erro no servidor para obter a transcrição do áudio"})
        }
    })
}

export const obterAudioModificado = async (bufferAudio, tipo) =>{
    return new Promise((resolve,reject)=>{
        try{
            let resposta = {sucesso : false}
            let caminhoAudio = obterCaminhoTemporario('mp3')
            let saidaAudio = obterCaminhoTemporario('mp3')
            let ffmpegOpcoes = []
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
                    reject({sucesso: false, erro: `Esse tipo de edição não é suportado`})
            }
            
            ffmpeg(caminhoAudio).outputOptions(ffmpegOpcoes).save(saidaAudio)
            .on('end', async () => {
                let bufferAudioEditado = fs.readFileSync(saidaAudio)
                fs.unlinkSync(caminhoAudio)
                fs.unlinkSync(saidaAudio)
                resposta = {sucesso: true, resultado: bufferAudioEditado}
                resolve(resposta)
            })
            .on("error", ()=>{
                fs.unlinkSync(caminhoAudio)
                resposta = {sucesso: false, erro: `Houve um erro na modificação do áudio`}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterAudioModificado - ${err.message}`)
            reject({sucesso: false, erro: `Houve um erro na modificação do áudio`})
        }
    })
}

export const obterReconhecimentoMusica = async (bufferMidia, {acr_host, acr_access_key, acr_access_secret}) =>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            let bufferAudio
            let {mime: tipoArquivo} = await fileTypeFromBuffer(bufferMidia)

            if(!acr_host || !acr_access_key || !acr_access_secret){
                resposta = {sucesso: false, erro: 'As chaves do ACRCloud não foram inseridas corretamente'}
                reject(resposta)
            }
            
            const acr = new acrcloud({
                host: acr_host?.trim(),
                access_key: acr_access_key?.trim(),
                access_secret: acr_access_secret?.trim()
            })

            if(tipoArquivo.startsWith('video')){
                bufferAudio = (await converterMp4ParaMp3(bufferMidia)).resultado
            } else if (tipoArquivo.startsWith('audio')){
                bufferAudio = bufferMidia
            } else {
                resposta = {sucesso: false, erro: 'Esse tipo de mensagem não é suportado.'}
                reject(resposta)
            }

            await acr.identify(bufferAudio).then((resp)=>{
                if(resp.status.code == 1001) {
                    resposta = {sucesso: false, erro: 'Não foi encontrada uma música compatível.'}
                    reject(resposta)
                }
                if(resp.status.code == 3003 || resp.status.code == 3015){
                    resposta = {sucesso: false, erro: 'Você excedeu o limite do ACRCloud, crie uma nova chave no site'}
                    reject(resposta)
                } 
                if(resp.status.code == 3000){
                    resposta = {sucesso: false, erro: 'Houve um erro no servidor do ACRCloud, tente novamente mais tarde"'}
                    reject(resposta)
                }
                let arrayDataLancamento = resp.metadata.music[0].release_date.split("-")
                let artistas = []
                for(let artista of resp.metadata.music[0].artists){
                    artistas.push(artista.name)
                }
                resposta =  {
                    sucesso: true,
                    resultado:{
                        produtora : resp.metadata.music[0].label || "-----",
                        duracao: duration.default(resp.metadata.music[0].duration_ms).format("m:ss"),
                        lancamento: `${arrayDataLancamento[2]}/${arrayDataLancamento[1]}/${arrayDataLancamento[0]}`,
                        album: resp.metadata.music[0].album.name,
                        titulo: resp.metadata.music[0].title,
                        artistas: artistas.toString()
                    }
                }
                resolve(resposta)
            })
        } catch(err){
            console.log(`API obterReconhecimentoMusica - ${err.message}`)
            reject({sucesso: false, erro: 'Erro na conexão com a API ACRCloud ou sua chave ainda não está configurada para usar este comando.'})
        }
    })
}

