import {obterCaminhoTemporario} from '../lib/util.js'
import {criacaoSticker, adicionarExif} from '../lib/sticker.js'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'

export function criarSticker(bufferMidia : Buffer, {pack = 'LBOT', autor = 'LBOT Stickers', fps = 9, tipo = 'padrao'}: {autor: string, pack: string, fps: number, tipo : "padrao"|"circulo"|"auto"}){
    return new Promise <Buffer> ((resolve)=>{
        criacaoSticker(bufferMidia, {pack, autor, fps, tipo}).then((bufferSticker)=>{
            resolve(bufferSticker)
        }).catch(() =>{
            throw new Error("Houve um erro na criação de sticker.")
        })
    })
}

export function renomearSticker(bufferSticker: Buffer, pack: string, autor: string){
    return new Promise <Buffer>((resolve)=>{
        adicionarExif(bufferSticker, pack, autor).then((bufferSticker)=>{
            resolve(bufferSticker)
        }).catch(() =>{
            throw new Error('Houve um erro ao renomear o sticker.')
        })
    })
}

export function stickerParaImagem(bufferSticker: Buffer){
    return new Promise <Buffer>((resolve)=>{
        let entradaWebp = obterCaminhoTemporario('webp')
        let saidaPng = obterCaminhoTemporario('png')
        fs.writeFileSync(entradaWebp, bufferSticker)
        ffmpeg(entradaWebp)
        .save(saidaPng)
        .on('end', ()=>{
            let bufferImagem = fs.readFileSync(saidaPng)
            fs.unlinkSync(entradaWebp)
            fs.unlinkSync(saidaPng)
            resolve(bufferImagem)
        })
        .on('error', ()=>{
            throw new Error('Houve um erro ao converter o sticker para imagem')
        })
    })
}