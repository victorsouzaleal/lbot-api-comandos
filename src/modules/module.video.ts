import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import axios from 'axios'
import {getTempPath} from '../shared/util.js'

export function convertMP4ToMP3 (videoBuffer: Buffer){
    return new Promise <Buffer> ((resolve)=>{
        let inputVideoPath = getTempPath('mp4')
        fs.writeFileSync(inputVideoPath, videoBuffer)
        let outputAudioPath = getTempPath('mp3')
        ffmpeg(inputVideoPath)
        .outputOptions(['-vn', '-codec:a libmp3lame', '-q:a 3'])
        .save(outputAudioPath)
        .on('end', () => {
            let audioBuffer = fs.readFileSync(outputAudioPath)
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

export function videoThumbnail(media : string | Buffer, type : "file"|"buffer"|"url"){
    return new Promise <Base64URLString> (async (resolve)=>{
        let inputPath : string = ''
        let outputThumbnailPath = getTempPath('jpg')
        if(type == "file"){
            inputPath = media as string
        } else if(type == "buffer"){
            inputPath = getTempPath('mp4')
            fs.writeFileSync(inputPath, media as Buffer)
        } else if(type == "url"){
            let urlResponse = await axios.get(media as string,  { responseType: 'arraybuffer' })
            let bufferUrl = Buffer.from(urlResponse.data, "utf-8")
            inputPath = getTempPath('mp4')
            fs.writeFileSync(inputPath, bufferUrl)
        }
        ffmpeg(inputPath)
        .addOption("-y")
        .inputOptions(["-ss 00:00:00"])
        .outputOptions(["-vf scale=32:-1", "-vframes 1", "-f image2"])
        .save(outputThumbnailPath)
        .on('end', ()=>{
            if(type != 'file') fs.unlinkSync(inputPath)
            let thumbBase64 = fs.readFileSync(outputThumbnailPath).toString('base64')
            fs.unlinkSync(outputThumbnailPath)
            resolve(thumbBase64)
        })
        .on('error', ()=>{
            throw new Error("Houve um erro ao obter a thumbnail do video.")
        })
    })
  }