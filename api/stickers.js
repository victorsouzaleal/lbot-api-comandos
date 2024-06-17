import {obterCaminhoTemporario} from '../lib/util.js'
import {criacaoSticker, adicionarExif} from '../lib/sticker.js'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'


export const criarSticker = (bufferMidia, {pack = 'LBOT', autor = 'LBOT Stickers', fps = 9, tipo = 'padrao'})=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            await criacaoSticker(bufferMidia, {pack, autor, fps, tipo}).then((bufferSticker)=>{
                resposta.resultado = bufferSticker
                resolve(resposta)
            }).catch(() =>{
                resposta.erro = 'Houve um erro na criação de sticker.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API criarSticker - ${err.message}`)
            reject({erro: "Houve um erro na criação de sticker."})
        }
    })
}

export const renomearSticker = (bufferSticker, pack, autor)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            await adicionarExif(bufferSticker, pack, autor).then((bufferSticker)=>{
                resposta.resultado = bufferSticker
                resolve(resposta)
            }).catch(() =>{
                resposta.erro = 'Houve um erro ao renomear o sticker.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API renomearSticker - ${err.message}`)
            reject({erro: "Houve um erro ao renomear o sticker."})
        }
    })
}

export const stickerParaImagem = (bufferSticker)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
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
        } catch(err){
            console.log(`API stickerParaImagem - ${err.message}`)
            reject({erro: "Houve um erro ao converter o sticker para imagem"})
        }
    })
}