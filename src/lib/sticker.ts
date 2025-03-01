import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import crypto from 'node:crypto'
import webp from "node-webpmux"
import {getTempPath} from './util.js'
import {fileTypeFromBuffer} from 'file-type'
import jimp from 'jimp'
import { StickerOptions, StickerType } from "./interfaces.js"

export function createSticker(mediaBuffer : Buffer, {pack = 'LBOT', author = 'LBOT Stickers', fps = 9, type = 'resize'}: StickerOptions){
    return new Promise <Buffer> ((resolve)=>{
        stickerCreation(mediaBuffer, {pack, author, fps, type}).then((bufferSticker)=>{
            resolve(bufferSticker)
        }).catch(() =>{
            throw new Error("Houve um erro na criação de sticker.")
        })
    })
}

export function renameSticker(stickerBuffer: Buffer, pack: string, author: string){
    return new Promise <Buffer>((resolve)=>{
        addExif(stickerBuffer, pack, author).then((stickerBufferModified)=>{
            resolve(stickerBufferModified)
        }).catch(() =>{
            throw new Error('Houve um erro ao renomear o sticker.')
        })
    })
}

export function stickerToImage(stickerBuffer: Buffer){
    return new Promise <Buffer>((resolve)=>{
        const inputWebpPath = getTempPath('webp')
        const outputPngPath = getTempPath('png')
        fs.writeFileSync(inputWebpPath, stickerBuffer)
        ffmpeg(inputWebpPath)
        .save(outputPngPath)
        .on('end', ()=>{
            const imageBuffer = fs.readFileSync(outputPngPath)
            fs.unlinkSync(inputWebpPath)
            fs.unlinkSync(outputPngPath)
            resolve(imageBuffer)
        })
        .on('error', ()=>{
            throw new Error('Houve um erro ao converter o sticker para imagem')
        })
    })
}

async function stickerCreation(mediaBuffer : Buffer, {author, pack, fps, type} : StickerOptions){
    try{
        const bufferData = await fileTypeFromBuffer(mediaBuffer)

        if(!bufferData) {
            throw new Error("Não foi possível obter os dados do mídia enviada.")
        }

        const mime = bufferData.mime
        const isAnimated = mime.startsWith('video') || mime.includes('gif') 
        const webpBuffer = await webpConvertion(mediaBuffer, isAnimated, fps, type)
        const stickerBuffer = await addExif(webpBuffer, pack, author)
        return stickerBuffer
    } catch(err){
        throw err
    }   
}

async function addExif(buffer: Buffer, pack: string, author: string){
    try{
        const img = new webp.Image()
        const stickerPackId = crypto.randomBytes(32).toString('hex')
        const json = { 'sticker-pack-id': stickerPackId, 'sticker-pack-name': pack, 'sticker-pack-publisher': author}
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        const exif = Buffer.concat([exifAttr, jsonBuffer])
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