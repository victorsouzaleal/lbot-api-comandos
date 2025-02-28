import ffmpeg from "fluent-ffmpeg"
import crypto from 'node:crypto'
import webp from "node-webpmux"
import fs from 'fs-extra'
import {getTempPath} from './util.js'
import {fileTypeFromBuffer} from 'file-type'
import jimp from 'jimp'
import { StickerOptions, StickerType } from "./interfaces.js"

export async function stickerCreation(mediaBuffer : Buffer, {author, pack, fps, type} : StickerOptions){
    try{
        let bufferData = await fileTypeFromBuffer(mediaBuffer)
        let mime = bufferData?.mime
        if(!mime) throw new Error
        let isAnimated = mime.startsWith('video') || mime.includes('gif')
        const webpBuffer = await webpConvertion(mediaBuffer, isAnimated, fps, type)
        const stickerBuffer = await addExif(webpBuffer, pack, author)
        return stickerBuffer
    } catch(err){
        throw err
    }   
}

export async function addExif(buffer: Buffer, pack: string, author: string){
    try{
        const img = new webp.Image()
        const stickerPackId = crypto.randomBytes(32).toString('hex')
        const json = { 'sticker-pack-id': stickerPackId, 'sticker-pack-name': pack, 'sticker-pack-publisher': author}
        let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        let exif = Buffer.concat([exifAttr, jsonBuffer])
        exif.writeUIntLE(jsonBuffer.length, 14, 4)
        await img.load(buffer)
        img.exif = exif
        const stickerBuffer : Buffer = await img.save(null)
        return stickerBuffer
    } catch(err){
        throw err
    }
}

function webpConvertion(mediaBuffer : Buffer, isAnimated: boolean, fps: number, type : StickerType){
    return new Promise <Buffer> (async (resolve)=>{
        let inputMediaPath
        let options
        let outputMediaPath = getTempPath('webp')

        if(isAnimated){
            inputMediaPath = getTempPath('mp4')
            options = [
                "-vcodec libwebp",
                "-filter:v",
                `fps=fps=${fps}`,
                "-lossless 0",
                "-compression_level 4",
                "-q:v 10",
                "-loop 1",
                "-preset picture",
                "-an",
                "-vsync 0",
                "-s 512:512"
            ]
        } else{
            inputMediaPath = getTempPath('png')
            mediaBuffer = await editImage(mediaBuffer, type)
            options = [
                "-vcodec libwebp",
                "-loop 0",
                "-lossless 1",
                "-q:v 100"
            ]
        }

        fs.writeFileSync(inputMediaPath, mediaBuffer)

        ffmpeg(inputMediaPath).outputOptions(options).save(outputMediaPath).on('end', async ()=>{
            let webpBuffer = fs.readFileSync(outputMediaPath)
            fs.unlinkSync(outputMediaPath)
            fs.unlinkSync(inputMediaPath)
            resolve(webpBuffer)
        }).on('error', async (err)=>{
            fs.unlinkSync(inputMediaPath)
            throw err
        })
    })
}

async function editImage(imageBuffer: Buffer, type: StickerType){
    const image = await jimp.read(imageBuffer)
    if(type === 'resize'){
        image['resize'](512,512)
    } else if (type === 'contain'){
        image['contain'](512,512)
    } else if(type === 'circle'){
        image['resize'](512,512)
        image.circle()
    }
    return image.getBufferAsync('image/png')
}
