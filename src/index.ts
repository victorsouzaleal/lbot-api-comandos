import ffmpeg from "fluent-ffmpeg"
import('@ffmpeg-installer/ffmpeg').then((ffmpegInstaller)=>{
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)
}).catch(()=>{})

import * as audioLibrary from './lib/audio.js'
import * as downloadLibrary from './lib/download.js'
import * as generalLibrary from './lib/general.js'
import * as aiLibrary from './lib/ai.js'
import * as imageLibrary from './lib/image.js'
import * as videoLibrary from './lib/video.js'
import * as stickerLibrary from './lib/sticker.js'

export {audioLibrary, downloadLibrary, generalLibrary, aiLibrary, imageLibrary, videoLibrary, stickerLibrary}