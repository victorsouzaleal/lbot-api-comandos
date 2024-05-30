import {obterCaminhoTemporario} from '../lib/util.js'
import {toSticker, updateExif} from '../lib/sticker.js'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'


export const criarSticker = (bufferMidia, opcoes)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            await toSticker(bufferMidia, {pack: opcoes?.pack, author: opcoes?.autor, fps: opcoes?.fps, type: opcoes?.tipo}).then((bufferSticker)=>{
                resposta = {sucesso: true, resultado: bufferSticker}
                resolve(resposta)
            }).catch(() =>{
                resposta = {sucesso: false, erro: 'Houve um erro na criação de sticker.'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API criarSticker - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro na criação de sticker."})
        }
    })
}

export const renomearSticker = (bufferSticker, pack, autor)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            await updateExif(bufferSticker, pack, autor).then((bufferSticker)=>{
                resposta = {sucesso: true, resultado: bufferSticker}
                resolve(resposta)
            }).catch(() =>{
                resposta = {sucesso: false, erro: 'Houve um erro ao renomear o sticker.'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API renomearSticker - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro ao renomear o sticker."})
        }
    })
}

export const stickerParaImagem = (bufferSticker)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            let entradaWebp = obterCaminhoTemporario('webp')
            let saidaPng = obterCaminhoTemporario('png')
            fs.writeFileSync(entradaWebp, bufferSticker)
            ffmpeg(entradaWebp)
            .save(saidaPng)
            .on('end', ()=>{
                let bufferImagem = fs.readFileSync(saidaPng)
                fs.unlinkSync(entradaWebp)
                fs.unlinkSync(saidaPng)
                resposta = {sucesso: true, resultado: bufferImagem}
                resolve(resposta)
            })
            .on('error', ()=>{
                resposta = {sucesso: false, erro: 'Houve um erro ao converter o sticker para imagem'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API stickerParaImagem - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro ao converter o sticker para imagem"})
        }
    })
}