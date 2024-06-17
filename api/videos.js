import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import axios from 'axios'
import {obterCaminhoTemporario} from '../lib/util.js'

export const converterMp4ParaMp3 = (bufferVideo) => {
    return new Promise((resolve,reject)=>{
        try{
            let resposta = {}
            let caminhoVideo = obterCaminhoTemporario('mp4')
            fs.writeFileSync(caminhoVideo, bufferVideo)
            let saidaAudio = obterCaminhoTemporario('mp3')
            ffmpeg(caminhoVideo)
            .outputOptions(['-vn', '-codec:a libmp3lame', '-q:a 3'])
            .save(saidaAudio)
            .on('end', () => {
                let bufferAudio = fs.readFileSync(saidaAudio)
                fs.unlinkSync(caminhoVideo)
                fs.unlinkSync(saidaAudio)
                resposta.resultado = bufferAudio
                resolve(resposta)
            })
            .on("error", (err)=>{
                fs.unlinkSync(caminhoVideo)
                resposta.erro = 'Houve um erro na conversão para MP3.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API converterMp4ParaMp3 - ${err.message}`)
            reject({erro: "Houve um erro na conversão para MP3."})
        }
    })
}

export const obterThumbnailVideo = async(midia, tipo = "file") =>{
    return new Promise(async (resolve,reject)=>{
        try{
            let resposta = {}
            let caminhoEntrada
            let saidaThumbImagem = obterCaminhoTemporario('jpg')
            if(tipo == "file"){
                caminhoEntrada = midia
            } else if(tipo == "buffer"){
                caminhoEntrada = obterCaminhoTemporario('mp4')
                fs.writeFileSync(caminhoEntrada, midia)
            } else if(tipo == "url"){
                let urlResponse = await axios.get(midia,  { responseType: 'arraybuffer' })
                let bufferUrl = Buffer.from(urlResponse.data, "utf-8")
                caminhoEntrada = obterCaminhoTemporario('mp4')
                fs.writeFileSync(caminhoEntrada, bufferUrl)
            }
            ffmpeg(caminhoEntrada)
            .addOption("-y")
            .inputOptions(["-ss 00:00:00"])
            .outputOptions(["-vf scale=32:-1", "-vframes 1", "-f image2"])
            .save(saidaThumbImagem)
            .on('end', ()=>{
                if(tipo != 'file') fs.unlinkSync(caminhoEntrada)
                let thumbBase64 = fs.readFileSync(saidaThumbImagem).toString('base64')
                fs.unlinkSync(saidaThumbImagem)
                resposta.resultado = thumbBase64
                resolve(resposta)
            })
            .on('error', (err)=>{
                resposta.erro = 'Houve um erro ao obter a thumbnail do video.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterThumbnailVideo - ${err.message}`)
            reject({erro: "Houve um erro ao obter a thumbnail do video."})
        }
        
    })
  }