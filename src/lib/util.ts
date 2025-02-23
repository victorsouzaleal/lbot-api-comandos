import moment from "moment-timezone"
import crypto from 'node:crypto'
import {tmpdir} from 'node:os'
import path  from "node:path"
import fs from 'fs-extra'

export function timestampParaData(timestampMsg: number){
  return moment(timestampMsg).format('DD/MM HH:mm:ss')
}

export function formatarSegundos(segundos : number){
  return moment(segundos * 1000).format('mm:ss')
}

export function dataHoraAtual(){
  return moment(Date.now()).format('DD/MM HH:mm:ss')
}

export function primeiraLetraMaiuscula(palavra : string) : string {
  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
}

export function obterNomeAleatorio(extensao: string){
  return `${Math.floor(Math.random() * 10000)}.${extensao}`
}

export function obterCaminhoTemporario(extensao: string){
  if(!fs.existsSync(path.join(tmpdir(), 'biblioteca-lbot'))) fs.mkdirSync(path.join(tmpdir(), 'biblioteca-lbot'))
  return path.join(tmpdir(), 'biblioteca-lbot', `${crypto.randomBytes(20).toString('hex')}.${extensao}`)
}

