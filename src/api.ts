import ffmpeg from "fluent-ffmpeg"
import('@ffmpeg-installer/ffmpeg').then((ffmpegInstaller)=>{
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)
}).catch(()=>{})

import * as Audios from './modules/audios.js'
import * as Downloads from './modules/downloads.js'
import * as Gerais from './modules/gerais.js'
import * as IA from './modules/ia.js'
import * as Imagens from './modules/imagens.js'
import * as Videos from './modules/videos.js'
import * as Stickers from './modules/stickers.js'

const api  =  {
    Audios,
    Downloads,
    Gerais,
    IA,
    Imagens,
    Videos,
    Stickers
}

export default api