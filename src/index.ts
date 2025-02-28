import ffmpeg from "fluent-ffmpeg"
import('@ffmpeg-installer/ffmpeg').then((ffmpegInstaller)=>{
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)
}).catch(()=>{})

import * as audioLibrary from './modules/module.audio.js'
import * as downloadLibrary from './modules/module.download.js'
import * as generalLibrary from './modules/module.general.js'
import * as aiLibrary from './modules/module.ai.js'
import * as imageLibrary from './modules/module.image.js'
import * as videoLibrary from './modules/module.video.js'
import * as stickerLibrary from './modules/module.sticker.js'

export {audioLibrary, downloadLibrary, generalLibrary, aiLibrary, imageLibrary, videoLibrary, stickerLibrary}