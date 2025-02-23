import axios from 'axios'
import { Hercai } from "hercai"
import qs from 'node:querystring'
import {obterTraducao} from './gerais.js'

export function obterRespostaIA(texto: string){
    return new Promise <string> ((resolve)=>{
        const herc = new Hercai()
        herc.question({content: texto, model: "v3"})
        .then((respostaHercai)=>{
            resolve(respostaHercai.reply)
        })
        .catch((err)=>{
            if(err.message == 'Error: Request failed with status code 429') throw new Error("Limite de pedidos foi excedido, tente novamente mais tarde")
            throw new Error("Houve um erro no servidor, tente novamente mais tarde.")
        })
    })
}

export function obterImagemIA(texto: string){
    return new Promise <string> ((resolve)=>{
        const herc = new Hercai()
        obterTraducao(texto, 'en')
        .then((traducao)=>{
            herc.drawImage({model: 'v3', prompt: traducao})
            .then((respostaHercai)=>{
                if(!respostaHercai.url) throw new Error('O servidor não está gerando imagens no momento, tente novamente mais tarde.')
                resolve(respostaHercai.url)
            })
            .catch((err)=>{
                if(err.message == 'Error: Request failed with status code 429') throw new Error('Limite de pedidos foi excedido, tente novamente mais tarde')
                throw new Error('Houve um erro no servidor, tente novamente mais tarde.')
            })
        })
        .catch(()=>{
            throw new Error("Houve um erro na tradução do prompt, tente novamente mais tarde.")
        })
    })
}

export function obterRespostaSimi(texto: string){
    return new Promise <string> ((resolve)=>{
        let config = {
            url: "https://api.simsimi.vn/v2/simtalk",
            method: "post",
            headers : {'Content-Type': 'application/x-www-form-urlencoded'},
            data : qs.stringify({text: texto, lc: 'pt'})
        }

        axios(config).then((simi)=>{
            resolve(simi.data.message)
        }).catch((err)=>{
            if(err.response?.data?.message) resolve(err.response.data.message)
            throw new Error("Houve um erro no servidor do SimSimi.")
        })
    })
}
