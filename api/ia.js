import axios from 'axios'
import { Hercai } from "hercai"
import qs from 'node:querystring'
import {obterTraducao} from './gerais.js'

export const obterRespostaIA = async(texto, id_usuario)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            const herc = new Hercai()
            await herc.betaQuestion({content: texto, user: id_usuario}).then((respostaHercai)=>{
                resposta = {sucesso: true, resultado: respostaHercai.reply}
                resolve(resposta)
            }).catch((err)=>{
                if(err.message == 'Error: Request failed with status code 429'){
                    resposta = {sucesso: false, erro: 'Limite de pedidos foi excedido, tente novamente mais tarde'}
                } else {
                    resposta = {sucesso: false, erro:'Houve um erro no servidor, tente novamente mais tarde.'}
                }
                reject(resposta)
            })
        } catch(err) {
            console.log(`API obterRespostaIA - ${err.message}`)
            reject({sucesso: false, erro:'Houve um erro no servidor, tente novamente mais tarde.'})
        }
    })
}

export const obterImagemIA = async(texto)=>{
    return new Promise(async (resolve,reject)=>{
        try{
            const herc = new Hercai()
            let resposta = {sucesso: false}
            let {resultado} = await obterTraducao(texto, 'en')
            await herc.betaDrawImage({prompt: resultado, width: 256, height:256}).then((respostaHercai)=>{
                if(respostaHercai.status == 404) {
                    resposta = {sucesso: false, erro: 'O texto que você colocou é inválido ou não pode ser criado.'}
                    reject(resposta)
                }else if(respostaHercai.status == 406) {
                    resposta = {sucesso: false, erro: 'Houve um erro para criar a imagem, o projeto ainda está em BETA então tente novamente.'}
                    reject(resposta)
                } else {
                    resposta = {sucesso: true, resultado: respostaHercai.url}
                    resolve(resposta)
                }
            }).catch((erro)=>{
                if(erro.message == 'Error: Request failed with status code 429'){
                    resposta = {sucesso: false, erro: 'Limite de pedidos foi excedido, tente novamente mais tarde'}
                } else {
                    resposta = {sucesso: false, erro:'Houve um erro no servidor, tente novamente mais tarde.'}
                }
                reject(resposta)
            })
        } catch(err) {
            console.log(`API obterImagemIA - ${err.message}`)
            reject({sucesso: false, erro:'Houve um erro no servidor, tente novamente mais tarde.'})
        }
    })
}

export const obterRespostaSimi = async(texto)=>{
    return new Promise(async(resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            let config = {
                url: "https://api.simsimi.vn/v2/simtalk",
                method: "post",
                headers : {'Content-Type': 'application/x-www-form-urlencoded'},
                data : qs.stringify({text: texto, lc: 'pt'})
            }

            await axios(config).then((simiresposta)=>{
                resposta = {sucesso: true, resultado: simiresposta.data.message}
                resolve(resposta)
            }).catch((err)=>{
                if(err.response?.data?.message){
                    resposta = {sucesso: true, resultado: err.response.data.message}
                    resolve(resposta)
                } else {
                    resposta = {sucesso: false, erro: "Houve um erro no servidor do SimSimi."}
                    reject(resposta)
                }
            })
        } catch(err){
            console.log(`API obterRespostaSimi - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro no servidor do SimSimi."})
        }
    })
}
