import ffmpeg from "fluent-ffmpeg"
import crypto from 'node:crypto'
import webp from "node-webpmux"
import fs from 'fs-extra'
import {obterCaminhoTemporario} from './util.js'
import {fileTypeFromBuffer} from 'file-type'
import jimp from 'jimp'


export const toSticker  = async (buffer, stickerOptions = {author : 'not_defined', pack : 'not_defined', fps : 10, type: 'default'}) =>{
    try{
        let options = {
            author: stickerOptions?.author || 'not_defined',
            pack : stickerOptions?.pack || 'not_defined',
            fps: stickerOptions?.fps || 10,
            type: stickerOptions.type || 'default'
        }
        let bufferWebp = await createSticker(buffer, options)
        return bufferWebp
    } catch(err){
        throw err
    }
}

export const updateExif = async(buffer, pack, author) =>{
    try{
        let bufferWebp = await addExif(buffer, pack, author)
        return bufferWebp
    } catch(err){
        throw err
    }
}

export const StickerTypes = {
    CIRCLE: 'circle',
    DEFAULT: 'default'
}

async function createSticker(buffer, options){
    let {mime} = await fileTypeFromBuffer(buffer)
    let isVideo = mime.startsWith('video')
    let isAnimated = isVideo || mime.includes('gif')
    const bufferWebp = await convertToWebp(buffer, isAnimated, options)
    return await addExif(bufferWebp, options.pack, options.author)
}

async function convertToWebp(buffer, isAnimated, options){
    return new Promise(async (resolve,reject)=>{
        let inputPath,optionsFfmpeg, webpPath = obterCaminhoTemporario('webp')
        if(isAnimated){
            inputPath = obterCaminhoTemporario('mp4')
            optionsFfmpeg = [
                "-vcodec libwebp",
                "-filter:v",
                `fps=fps=${options.fps}`,
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
            inputPath = obterCaminhoTemporario('png')
            buffer = await editImage(buffer, options.type)
            optionsFfmpeg = [
                "-vcodec libwebp",
                "-loop 0",
                "-lossless 1",
                "-q:v 100"
            ]
        }

        fs.writeFileSync(inputPath, buffer)

        ffmpeg(inputPath).outputOptions(optionsFfmpeg).save(webpPath).on('end', async ()=>{
            let buffer = fs.readFileSync(webpPath)
            fs.unlinkSync(webpPath)
            fs.unlinkSync(inputPath)
            resolve(buffer)
        }).on('error', async (err)=>{
            fs.unlinkSync(inputPath)
            reject(err)
        })
    })
}

async function editImage(buffer, type){
    const image = await jimp.read(buffer)
    image.resize(512,512)
    switch (type) {
        case 'circle':
            image.circle()
            break
        case 'default':
            break
    }
    return await image.getBufferAsync('image/png')
}

async function addExif(buffer, pack, author){
    const img = new webp.Image()
    const stickerPackId = crypto.randomBytes(32).toString('hex')
    const json = { 'sticker-pack-id': stickerPackId, 'sticker-pack-name': pack, 'sticker-pack-publisher': author}
    let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
    let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
    let exif = Buffer.concat([exifAttr, jsonBuffer])
    exif.writeUIntLE(jsonBuffer.length, 14, 4)
    await img.load(buffer)
    img.exif = exif
    return await img.save(null)
}