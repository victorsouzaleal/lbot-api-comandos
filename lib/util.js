import moment from "moment-timezone"
import crypto from 'node:crypto'
import {tmpdir} from 'node:os'
import path  from "node:path"
import fs from 'fs-extra'

export const timestampParaData = (timestampMsg)=>{
    return moment(timestampMsg).format('DD/MM HH:mm:ss')
}

export const formatarSegundos = (segundos)=>{
  return moment(segundos * 1000).format('mm:ss')
}

export const dataHoraAtual = ()=>{
  return moment(Date.now()).format('DD/MM HH:mm:ss')
}

export const primeiraLetraMaiuscula = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const obterNomeAleatorio =(ext)=>{
    return `${Math.floor(Math.random() * 10000)}.${ext}`
}

export const obterCaminhoTemporario = (ext) =>{
    if(!fs.existsSync(path.join(tmpdir(), 'lbot-api-midias'))) fs.mkdirSync(path.join(tmpdir(), 'lbot-api-midias'))
    return path.join(tmpdir(), 'lbot-api-midias', `${crypto.randomBytes(20).toString('hex')}.${ext}`)
}

