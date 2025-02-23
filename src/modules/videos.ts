import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import axios from 'axios'
import {obterCaminhoTemporario} from '../lib/util.js'


export function converterMp4ParaMp3 (bufferVideo: Buffer){
    return new Promise <Buffer> ((resolve,reject)=>{
        try{
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
                resolve(bufferAudio)
            })
            .on("error", (err)=>{
                fs.unlinkSync(caminhoVideo)
                throw new Error("Houve um erro na conversão de MP4 para MP3.")
            })
        } catch(err){
            reject(err)
        }
    })
}


interface ResObterThumbnailVideo {
    resultado?: string
    erro?: string
}

export const obterThumbnailVideo = async(midia : string | Buffer, tipo = "file") =>{
    return new Promise <ResObterThumbnailVideo> (async (resolve,reject)=>{
        try{
            let resposta : ResObterThumbnailVideo = {}
            let caminhoEntrada : string = ''
            let saidaThumbImagem = obterCaminhoTemporario('jpg')
            if(tipo == "file"){
                caminhoEntrada = midia as string
            } else if(tipo == "buffer"){
                caminhoEntrada = obterCaminhoTemporario('mp4')
                fs.writeFileSync(caminhoEntrada, midia as Buffer)
            } else if(tipo == "url"){
                let urlResponse = await axios.get(midia as string,  { responseType: 'arraybuffer' })
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
        } catch(err : any){
            console.log(`API obterThumbnailVideo - ${err.message}`)
            reject({erro: "Houve um erro ao obter a thumbnail do video."})
        }
        
    })
  }