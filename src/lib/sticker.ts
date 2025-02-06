import ffmpeg from "fluent-ffmpeg"
import crypto from 'node:crypto'
import webp from "node-webpmux"
import fs from 'fs-extra'
import {obterCaminhoTemporario} from './util.js'
import {fileTypeFromBuffer} from 'file-type'
import jimp from 'jimp'

export const StickerTipos= {
    CIRCULO: 'circulo',
    PADRAO: 'padrao'
}

export async function criacaoSticker(buffer : Buffer, {autor = 'LBOT', pack = 'LBOT Stickers', fps = 9, tipo = 'padrao'}){
    try{
        let dadosBuffer = await fileTypeFromBuffer(buffer)
        let mime  = dadosBuffer?.mime
        if(!mime) throw new Error
        let midiaVideo = mime.startsWith('video')
        let midiaAnimada = midiaVideo || mime.includes('gif')
        const bufferWebp = await conversaoWebP(buffer, midiaAnimada, fps, tipo)
        return await adicionarExif(bufferWebp, pack, autor)
    } catch(err){
        throw err
    }   
}

export async function adicionarExif(buffer: Buffer, pack: string, autor: string){
    try{
        const img = new webp.Image()
        const stickerPackId = crypto.randomBytes(32).toString('hex')
        const json = { 'sticker-pack-id': stickerPackId, 'sticker-pack-name': pack, 'sticker-pack-publisher': autor}
        let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        let exif = Buffer.concat([exifAttr, jsonBuffer])
        exif.writeUIntLE(jsonBuffer.length, 14, 4)
        await img.load(buffer)
        img.exif = exif
        return await img.save(null)
    } catch(err){
        throw err
    }
}

async function conversaoWebP(buffer : Buffer, midiaAnimada: boolean, fps: number, tipo : string){
    return new Promise <Buffer> (async (resolve,reject)=>{
        try{
            let caminhoEntrada
            let opcoesFfmpeg
            let caminhoSaida = obterCaminhoTemporario('webp')
    
            if(midiaAnimada){
                caminhoEntrada = obterCaminhoTemporario('mp4')
                opcoesFfmpeg = [
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
                caminhoEntrada = obterCaminhoTemporario('png')
                buffer = await edicaoImagem(buffer, tipo)
                opcoesFfmpeg = [
                    "-vcodec libwebp",
                    "-loop 0",
                    "-lossless 1",
                    "-q:v 100"
                ]
            }
    
            fs.writeFileSync(caminhoEntrada, buffer)
    
            ffmpeg(caminhoEntrada).outputOptions(opcoesFfmpeg).save(caminhoSaida).on('end', async ()=>{
                let buffer = fs.readFileSync(caminhoSaida)
                fs.unlinkSync(caminhoSaida)
                fs.unlinkSync(caminhoEntrada)
                resolve(buffer)
            }).on('error', async (err)=>{
                fs.unlinkSync(caminhoEntrada)
                reject(err)
            })
        } catch(err){
            reject(err)
        }
    })
}

async function edicaoImagem(buffer: Buffer, tipo: string){
    const image = await jimp.read(buffer)
    const redimensionar = tipo === 'auto' ? 'contain' : 'resize'
    image[redimensionar](512,512)
    switch (tipo) {
        case 'circulo':
            image.circle()
            break
        case 'auto':
            break
        case 'padrao':
            break
        default:
            break
    }
    return await image.getBufferAsync('image/png')
}
