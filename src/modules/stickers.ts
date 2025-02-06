import {obterCaminhoTemporario} from '../lib/util.js'
import {criacaoSticker, adicionarExif} from '../lib/sticker.js'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'

interface ResCriarSticker {
    resultado?: Buffer
    erro?: string
}

export const criarSticker = (bufferMidia : Buffer, {pack = 'LBOT', autor = 'LBOT Stickers', fps = 9, tipo = 'padrao'})=>{
    return new Promise <ResCriarSticker> (async (resolve, reject)=>{
        try{
            let resposta : ResCriarSticker = {}
            await criacaoSticker(bufferMidia, {pack, autor, fps, tipo}).then((bufferSticker)=>{
                resposta.resultado = bufferSticker
                resolve(resposta)
            }).catch(() =>{
                resposta.erro = 'Houve um erro na criação de sticker.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API criarSticker - ${err.message}`)
            reject({erro: "Houve um erro na criação de sticker."})
        }
    })
}


interface ResRenomearSticker {
    resultado?: Buffer
    erro?: string
}

export const renomearSticker = (bufferSticker: Buffer, pack: string, autor: string)=>{
    return new Promise <ResRenomearSticker>(async (resolve, reject)=>{
        try{
            let resposta : ResRenomearSticker = {}
            await adicionarExif(bufferSticker, pack, autor).then((bufferSticker)=>{
                resposta.resultado = bufferSticker
                resolve(resposta)
            }).catch(() =>{
                resposta.erro = 'Houve um erro ao renomear o sticker.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API renomearSticker - ${err.message}`)
            reject({erro: "Houve um erro ao renomear o sticker."})
        }
    })
}


interface ResStickerParaImagem {
    resultado?: Buffer
    erro?: string
}

export const stickerParaImagem = (bufferSticker: Buffer)=>{
    return new Promise <ResStickerParaImagem>(async (resolve, reject)=>{
        try{
            let resposta : ResStickerParaImagem = {}
            let entradaWebp = obterCaminhoTemporario('webp')
            let saidaPng = obterCaminhoTemporario('png')
            fs.writeFileSync(entradaWebp, bufferSticker)
            ffmpeg(entradaWebp)
            .save(saidaPng)
            .on('end', ()=>{
                let bufferImagem = fs.readFileSync(saidaPng)
                fs.unlinkSync(entradaWebp)
                fs.unlinkSync(saidaPng)
                resposta.resultado = bufferImagem
                resolve(resposta)
            })
            .on('error', ()=>{
                resposta.erro = 'Houve um erro ao converter o sticker para imagem'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API stickerParaImagem - ${err.message}`)
            reject({erro: "Houve um erro ao converter o sticker para imagem"})
        }
    })
}