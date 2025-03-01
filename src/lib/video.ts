import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import axios from 'axios'
import {getTempPath} from './util.js'

export function convertMP4ToMP3 (videoBuffer: Buffer){
    return new Promise <Buffer> ((resolve)=>{
        const inputVideoPath = getTempPath('mp4')
        fs.writeFileSync(inputVideoPath, videoBuffer)
        const outputAudioPath = getTempPath('mp3')
        ffmpeg(inputVideoPath)
        .outputOptions(['-vn', '-codec:a libmp3lame', '-q:a 3'])
        .save(outputAudioPath)
        .on('end', () => {
            const audioBuffer = fs.readFileSync(outputAudioPath)
            fs.unlinkSync(inputVideoPath)
            fs.unlinkSync(outputAudioPath)
            resolve(audioBuffer)
        })
        .on("error", ()=>{
            fs.unlinkSync(inputVideoPath)
            throw new Error("Houve um erro na conversão de MP4 para MP3.")
        })
    })
}

export function videoThumbnail(videoMedia : string | Buffer, type : "file"|"buffer"|"url"){
    return new Promise <Base64URLString> (async (resolve)=>{
        let inputPath : string | undefined
        const outputThumbnailPath = getTempPath('jpg')

        if(type == "file"){
            if(typeof videoMedia !== 'string'){
                throw new Error('O tipo de operação está definido como FILE mas a mídia enviada não é um caminho de arquivo válido.')
            }

            inputPath = videoMedia
        } else if(type == "buffer"){
            if(!Buffer.isBuffer(videoMedia)){
                throw new Error('O tipo de operação está definido como BUFFER mas a mídia enviada não é um buffer válido.')
            }

            inputPath = getTempPath('mp4')
            fs.writeFileSync(inputPath, videoMedia)
        } else if(type == "url"){
            if(typeof videoMedia !== 'string'){
                throw new Error('O tipo de operação está definido como URL mas a mídia enviada não é uma url válida.')
            }

            const responseUrlBuffer = await axios.get(videoMedia,  { responseType: 'arraybuffer' })
            const bufferUrl = Buffer.from(responseUrlBuffer.data, "utf-8")
            inputPath = getTempPath('mp4')
            fs.writeFileSync(inputPath, bufferUrl)
        }

        ffmpeg(inputPath)
        .addOption("-y")
        .inputOptions(["-ss 00:00:00"])
        .outputOptions(["-vf scale=32:-1", "-vframes 1", "-f image2"])
        .save(outputThumbnailPath)
        .on('end', ()=>{
            if(type != 'file' && inputPath) {
                fs.unlinkSync(inputPath)
            }

            const thumbBase64 = fs.readFileSync(outputThumbnailPath).toString('base64')
            fs.unlinkSync(outputThumbnailPath)
            resolve(thumbBase64)
        })
        .on('error', ()=>{
            throw new Error("Houve um erro ao obter a thumbnail do video.")
        })
    })
  }