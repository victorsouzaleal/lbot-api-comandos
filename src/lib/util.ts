import moment from "moment-timezone"
import crypto from 'node:crypto'
import {tmpdir} from 'node:os'
import path  from "node:path"
import fs from 'fs-extra'
import { FileExtensions } from "./interfaces.js"

export function timestampToDate(timestamp: number){
  return moment(timestamp).format('DD/MM HH:mm:ss')
}

export function formatSeconds(seconds : number){
  return moment(seconds * 1000).format('mm:ss')
}

export function currentDate(){
  return moment(Date.now()).format('DD/MM HH:mm:ss')
}

export function uppercaseFirst(text : string) : string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getRandomFilename(ext: FileExtensions){
  return `${Math.floor(Math.random() * 10000)}.${ext}`
}

export function getTempPath(ext: FileExtensions){
  if(!fs.existsSync(path.join(tmpdir(), 'biblioteca-lbot'))) fs.mkdirSync(path.join(tmpdir(), 'biblioteca-lbot'))
  return path.join(tmpdir(), 'biblioteca-lbot', `${crypto.randomBytes(20).toString('hex')}.${ext}`)
}

