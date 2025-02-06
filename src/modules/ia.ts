import axios from 'axios'
import { Hercai } from "hercai"
import qs from 'node:querystring'
import {obterTraducao} from './gerais.js'

interface RespostaIA {
    resultado?: string
    erro?: string
}

export const obterRespostaIA = async(texto: string)=>{
    return new Promise <RespostaIA>(async (resolve, reject)=>{
        try{
            let resposta : RespostaIA = {}
            const herc = new Hercai()
            await herc.question({content: texto, model: "v3"}).then((respostaHercai)=>{
                resposta.resultado = respostaHercai.reply
                resolve(resposta)
            }).catch((err)=>{
                if(err.message == 'Error: Request failed with status code 429'){
                    resposta.erro = 'Limite de pedidos foi excedido, tente novamente mais tarde'
                } else {
                    resposta.erro = 'Houve um erro no servidor, tente novamente mais tarde.'
                }
                reject(resposta)
            })
        } catch(err : any) {
            console.log(`API obterRespostaIA - ${err.message}`)
            reject({erro:'Houve um erro no servidor, tente novamente mais tarde.'})
        }
    })
}


interface RespostaIA {
    resultado?: string
    erro?: string
}

export const obterImagemIA = async(texto: string)=>{
    return new Promise <RespostaIA>(async (resolve,reject)=>{
        try{
            const herc = new Hercai()
            let resposta : RespostaIA = {}
            let respostaTraducao = await obterTraducao(texto, 'en')

            if(!respostaTraducao.resultado){
                resposta.erro = 'Houve um erro na tradução do prompt, tente novamente mais tarde.'
                reject(resposta)
            } else {
                await herc.drawImage({model: 'v3', prompt: respostaTraducao.resultado}).then((respostaHercai)=>{
                    if(!respostaHercai.url) {
                        resposta.erro = 'Houve um erro no servidor, tente novamente mais tarde.'
                        reject(resposta)
                    } else {
                        resposta.resultado = respostaHercai.url
                        resolve(resposta)
                    }
                }).catch((erro)=>{
                    if(erro.message == 'Error: Request failed with status code 429'){
                        resposta.erro = 'Limite de pedidos foi excedido, tente novamente mais tarde'
                    } else {
                        resposta.erro = 'Houve um erro no servidor, tente novamente mais tarde.'
                    }
                    reject(resposta)
                })
            }   
        } catch(err : any) {
            console.log(`API obterImagemIA - ${err.message}`)
            reject({erro:'Houve um erro no servidor, tente novamente mais tarde.'})
        }
    })
}


interface RespostaSimi {
    resultado?: string
    erro?: string
}

export const obterRespostaSimi = async(texto: string)=>{
    return new Promise <RespostaSimi>(async(resolve, reject)=>{
        try{
            let resposta : RespostaSimi = {}
            let config = {
                url: "https://api.simsimi.vn/v2/simtalk",
                method: "post",
                headers : {'Content-Type': 'application/x-www-form-urlencoded'},
                data : qs.stringify({text: texto, lc: 'pt'})
            }

            await axios(config).then((simiresposta)=>{
                resposta.resultado = simiresposta.data.message
                resolve(resposta)
            }).catch((err)=>{
                if(err.response?.data?.message){
                    resposta.resultado = err.response.data.message
                    resolve(resposta)
                } else {
                    resposta.erro = "Houve um erro no servidor do SimSimi."
                    reject(resposta)
                }
            })
        } catch(err : any){
            console.log(`API obterRespostaSimi - ${err.message}`)
            reject({erro: "Houve um erro no servidor do SimSimi."})
        }
    })
}
