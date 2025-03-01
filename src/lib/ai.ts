import axios from 'axios'
import { Hercai } from "hercai"
import qs from 'node:querystring'
import {translationGoogle} from './general.js'

export function hercaiQuestionAI(text: string){
    return new Promise <string> ((resolve)=>{
        const herc = new Hercai()
        herc.question({content: text, model: "v3"}).then((hercai)=>{
            resolve(hercai.reply)
        }).catch((err)=>{
            if(err.message == 'Error: Request failed with status code 429') 
                throw new Error("Limite de pedidos foi excedido, tente novamente mais tarde")
            else 
                throw new Error("Houve um erro no servidor, tente novamente mais tarde.")
        })
    })
}

export function hercaiImageAI(text: string){
    return new Promise <string> ((resolve)=>{
        const herc = new Hercai()
        translationGoogle(text, 'en').then((translation)=>{
            herc.drawImage({model: 'v3', prompt: translation}).then((hercai)=>{
                if(hercai.url)
                    resolve(hercai.url)
                else
                    throw new Error('O servidor não está gerando imagens no momento, tente novamente mais tarde.')
            }).catch((err)=>{
                if(err.message == 'Error: Request failed with status code 429') 
                    throw new Error('Limite de pedidos foi excedido, tente novamente mais tarde')
                else
                    throw new Error('Houve um erro no servidor, tente novamente mais tarde.')
            })
        }).catch(()=>{
            throw new Error("Houve um erro na tradução do prompt, tente novamente mais tarde.")
        })
    })
}

export function simSimi(text: string){
    return new Promise <string> ((resolve)=>{
        let config = {
            url: "https://api.simsimi.vn/v2/simtalk",
            method: "post",
            headers : {'Content-Type': 'application/x-www-form-urlencoded'},
            data : qs.stringify({text, lc: 'pt'})
        }

        axios(config).then((simi)=>{
            resolve(simi.data.message)
        }).catch((err)=>{
            if(err.response?.data?.message) 
                resolve(err.response.data.message)
            else
                throw new Error("Houve um erro no servidor do SimSimi.")
        })
    })
}
