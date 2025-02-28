import {getTempPath} from '../shared/util.js'
import {addExif, stickerCreation} from '../shared/sticker.js'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import { StickerOptions } from '../shared/interfaces.js'

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
        let inputWebpPath = getTempPath('webp')
        let outputPngPath = getTempPath('png')
        fs.writeFileSync(inputWebpPath, stickerBuffer)
        ffmpeg(inputWebpPath)
        .save(outputPngPath)
        .on('end', ()=>{
            let imageBuffer = fs.readFileSync(outputPngPath)
            fs.unlinkSync(inputWebpPath)
            fs.unlinkSync(outputPngPath)
            resolve(imageBuffer)
        })
        .on('error', ()=>{
            throw new Error('Houve um erro ao converter o sticker para imagem')
        })
    })
}