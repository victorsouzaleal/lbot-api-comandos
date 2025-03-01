import axios from 'axios'
import fs from 'fs-extra'
import {prettyNum} from 'pretty-num'
import { rastrearEncomendas, RastreioResponse } from 'correios-brasil'
import translate from '@vitalets/google-translate-api'
import google from '@victorsouzaleal/googlethis'
import { OrganicResult, search } from 'google-sr'
import Genius from 'genius-lyrics'
import qs from 'querystring'
import { timestampToDate } from './util.js'
import {obterDadosBrasileiraoA, obterDadosBrasileiraoB, DadosBrasileirao} from '@victorsouzaleal/brasileirao'
import {JSDOM} from 'jsdom'
import UserAgent from 'user-agents'
import { AnimeRelease, CurrencyConvert, DDD, MangaRelease, MusicLyrics, News, TruthMachine, WebSearch, Wheather } from './interfaces.js'
import path from 'node:path'
const mediaPath = path.resolve(import.meta.dirname, '..', 'media')

export function animeReleases(){
    return new Promise<AnimeRelease[]>((resolve)=>{
        const URL_BASE = 'https://animefire.plus/'
        axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}}).then(({data})=>{
            const { window : { document } } = new JSDOM(data)
            let $animes = document.querySelectorAll('div.divCardUltimosEpsHome')
            let animes : AnimeRelease[] = []

            $animes.forEach($anime =>{
                let name = $anime.querySelector('h3')?.innerHTML
                let episode = $anime.querySelector('span.numEp')?.innerHTML
                let url = $anime.querySelector('a')?.href

                if(!name || !episode || !url){
                    throw new Error("Houve um erro ao coletar os dados dos animes.")
                } 

                animes.push({
                    name,
                    episode,
                    url
                })
            })

            resolve(animes)
        }).catch(()=>{
            throw new Error("Houve um erro ao acessar o servidor de animes.")
        })
    })

}

export function mangaReleases(){
    return new Promise <MangaRelease[]> ((resolve) =>{
        const URL_BASE = 'https://mangabr.net/'
        axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}}).then(({data})=>{
            const { window : { document } } = new JSDOM(data)
            let $mangas = document.querySelectorAll('div.col-6.col-sm-3.col-md-3.col-lg-2.p-1')
            let mangas : MangaRelease[] = []

            $mangas.forEach($manga =>{
                let name = $manga.querySelector('h3.chapter-title > span.series-name')?.innerHTML.trim()
                let chapter = $manga.querySelector('h3.chapter-title > span.series-name')?.innerHTML.trim()
                let url = `https://mangabr.net${$manga.querySelector('a.link-chapter')?.getAttribute('href')}`
                
                if(!name || !chapter){
                    throw new Error("Houve um erro ao coletar os dados dos mangás.")
                }

                mangas.push({
                    name,
                    chapter,
                    url
                })
            })

            resolve(mangas)
        }).catch(()=>{
            throw new Error("Houve um erro ao acessar o servidor de mangás.")
        })
    })
}

export function brasileiraoTable(serie : "A" | "B"){
    return new Promise <DadosBrasileirao>(async(resolve)=>{
        const brasileiraoData = (serie == "A") ? await obterDadosBrasileiraoA() : await obterDadosBrasileiraoB()
        resolve(brasileiraoData)
    })
}

export function moviedbTrendings(type : 'filmes' | 'series' = "filmes"){
    return new Promise<string> ((resolve)=>{
        let num = 0
        const API_TYPE = (type == 'filmes') ? 'movie' : 'tv'
        const BASE_URL = `https://api.themoviedb.org/3/trending/${API_TYPE}/day?api_key=6618ac868ff51ffa77d586ee89223f49&language=pt-BR`
        axios.get(BASE_URL).then(({data})=>{
            const trendings : string = data.results.map((item: { title: string; name: string; overview: string })=>{
                num++;
                return `${num}°: *${item.title || item.name}.*\n\`Sinopse:\` ${item.overview} \n`
            }).join('\n')
            resolve(trendings as string)
        }).catch(() =>{
            throw new Error(`Houve um erro no servidor ao listar ${type === 'filmes' ? "os filmes" : "as séries"}.`)
        })
    })
}

export function calcExpression(expr: string){
    return new Promise <string> ((resolve)=>{
        const URL_BASE = 'https://api.mathjs.org/v4/'
        expr = expr.replace(/[Xx\xD7]/g, "*")
        expr = expr.replace(/\xF7/g, "/")
        expr = expr.replace(/,/g,".")
        expr = expr.replace("em","in")
        axios.post(URL_BASE, {expr}).then((res)=>{
            let calcResult = res.data.result;

            if(calcResult == "NaN" || calcResult == "Infinity"){
                throw new Error('Foi feita uma divisão por 0 ou algum outro cálculo inválido.');
            }

            calcResult = calcResult.split(" ")
            calcResult[0] = (calcResult[0].includes("e")) ? prettyNum(calcResult[0]) : calcResult[0]
            resolve(calcResult.join(" "))
        }).catch(()=>{
            throw new Error('Houve um erro no servidor de cálculo.')
        })
    })
}

export function newsGoogle(lang= 'pt'){
    return new Promise <News[]> ((resolve)=>{
        google.getTopNews(lang).then((newsList)=>{
            let newsResponse : News[] = []

            for(let news of newsList.headline_stories){
                newsResponse.push({
                    title : news.title,
                    published : news.published,
                    author: news.by,
                    url : news.url
                })
            }

            resolve(newsResponse)
        }).catch(()=>{
            throw new Error ("Houve um erro no servidor de notícias.")
        })
    })
}

export function translationGoogle(text: string, lang: string){
    return new Promise <string> ((resolve)=>{
        translate(text , {to: lang}).then((res)=>{
            resolve(res.text)
        }).catch(()=>{
            throw new Error('Houve um erro no servidor de tradução.')
        })
    })
}

export function shortenUrl(url: string){
    return new Promise <string> ((resolve)=>{
        const URL_BASE = 'https://shorter.me/page/shorten'
        axios.post(URL_BASE, qs.stringify({url, alias: '', password: ''})).then(({data})=>{
            if(!data.data){
                throw new Error(`O link que você inseriu é inválido.`)
            }

            resolve(data.data)
        }).catch(() =>{
            throw new Error(`Houve um erro no servidor de encurtar link.`)
        })
    })
}


export function trackingCorreios(codigoRastreio: string){
    return new Promise <RastreioResponse> (async (resolve)=>{
        rastrearEncomendas([codigoRastreio]).then((res)=>{
            if(!res) {
                throw new Error('Parece que este objeto ainda não foi postado ou não existe')
            }

            resolve(res)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor dos Correios.")
        })
    })
}

export function webSearchGoogle(texto: string){
    return new Promise <WebSearch[]> (async (resolve)=>{
        const searchResults = await search({
            query: texto,
            resultTypes: [OrganicResult],
            requestConfig: {
                params: {
                    safe: "off"
                }
            }
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de pesquisa web.")
        })

        if(!searchResults.length) {
            throw new Error ("Não foram encontrados resultados para esta pesquisa.")
        }
           
        let searchResponse : WebSearch[] = []

        for(let search of searchResults){
            searchResponse.push({
                title: search.title,
                url: search.link,
                description : search.description
            })
        }

        resolve(searchResponse)
    })
}

export function wheatherInfo(location: string){
    return new Promise <Wheather> ((resolve)=>{
        const WEATHER_API_URL = `http://api.weatherapi.com/v1/forecast.json?key=516f58a20b6c4ad3986123104242805&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`
        axios.get(WEATHER_API_URL).then(async (res)=>{
            const wheatherResult = res.data
            const {data: wheatherConditions} = await axios.get("https://www.weatherapi.com/docs/conditions.json", {responseType: 'json'})
            const currentCondition = wheatherConditions.find((condition: { code: number })=> {
                condition.code == wheatherResult.current.condition.code
            }).languages.find((language: { lang_iso: string }) =>{
                language.lang_iso == 'pt'
            })

            let weatherResponse : Wheather = {
                location: {
                    name: wheatherResult.location.name,
                    region: wheatherResult.location.region,
                    country: wheatherResult.location.country,
                    current_time: timestampToDate(wheatherResult.location.localtime_epoch * 1000)
                },
                current: {
                    last_updated: timestampToDate(wheatherResult.current.last_updated_epoch * 1000),
                    temp: `${wheatherResult.current.temp_c} C°`,
                    feelslike: `${wheatherResult.current.feelslike_c} C°`,
                    condition: wheatherResult.current.is_day ? currentCondition.day_text : currentCondition.night_text,
                    wind: `${wheatherResult.current.wind_kph} Km/h`,
                    humidity: `${wheatherResult.current.humidity} %`,
                    cloud: `${wheatherResult.current.cloud} %`
                },
                forecast: []
            }

            wheatherResult.forecast.forecastday.forEach((forecast : any) => {
                const conditionDay = wheatherConditions.find((condition: { code: number })=>{
                    condition.code == forecast.day.condition.code
                }).languages.find((idioma: { lang_iso: string }) => {
                    idioma.lang_iso == 'pt'
                })
                const [year, month, day] = forecast.date.split("-")
                const forecastDay = {
                    day : `${day}/${month}/${year}`,
                    max: `${forecast.day.maxtemp_c} C°`,
                    min: `${forecast.day.mintemp_c} C°`,
                    avg: `${forecast.day.avgtemp_c} C°`,
                    condition: `${conditionDay.day_text}`,
                    max_wind: `${forecast.day.maxwind_kph} Km/h`,
                    rain : `${forecast.day.daily_will_it_rain ? "Sim" : "Não"}`,
                    chance_rain : `${forecast.day.daily_chance_of_rain} %`,
                    snow: `${forecast.day.daily_will_it_snow ? "Sim" : "Não"}`,
                    chance_snow : `${forecast.day.daily_chance_of_snow} %`,
                    uv: forecast.day.uv
                }
                weatherResponse.forecast.push(forecastDay)
            })

            resolve(weatherResponse)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de pesquisa de clima.")
        })
    })
}

export function musicLyrics(text: string){
    return new Promise <MusicLyrics> ((resolve)=>{
        const geniusClient = new Genius.Client()
        geniusClient.songs.search(text).then(async (musicSearch)=>{
            if(!musicSearch.length){
                throw new Error("A letra da música não foi encontrada")
            } 

            resolve({
                title: musicSearch[0].title,
                artist: musicSearch[0].artist.name,
                image : musicSearch[0].artist.image,
                lyrics: await musicSearch[0].lyrics()
            })
        }).catch((err)=>{
            if(err.message == "No result was found"){
                throw new Error("A letra da música não foi encontrada")
            } else {
                throw new Error("Houve um erro no servidor para obter a letra da música.")
            }
        })
    })
}

export function convertCurrency(currency: "dolar" | "euro" | "real" | "iene", value: number){
    return new Promise <CurrencyConvert> ((resolve)=>{
        const URL_BASE = 'https://economia.awesomeapi.com.br/json/last/'
        value = parseInt(value.toString().replace(",","."))
        let params : string | undefined

        if(isNaN(value)){
            throw new Error('O valor não é um número válido')
        } else if(value > 1000000000000000){
            throw new Error('Quantidade muito alta, você provavelmente não tem todo esse dinheiro.')
        }     
        
        switch(currency){
            case 'dolar':
                params = "USD-BRL,USD-EUR,USD-JPY"
                break
            case 'euro':
                params = "EUR-BRL,EUR-USD,EUR-JPY"
                break
            case 'iene':
                params= "JPY-BRL,JPY-USD,JPY-EUR"
                break 
            case 'real':
                params= "BRL-USD,BRL-EUR,BRL-JPY"
                break                  
        }

        axios.get(URL_BASE+params).then(({data})=>{
            let convertResponse : CurrencyConvert = {
                value : value,
                currency: currency,
                convertion : []
            }

            for (let convertion in data){
                let currencyType = ''
                let currencySymbol = ''

                switch(data[convertion].codein){
                    case "BRL":
                        currencyType = "Real"
                        currencySymbol = "R$"
                        break
                    case "EUR":
                        currencyType = "Euro"
                        currencySymbol = "Є"
                        break
                    case "USD":
                        currencyType = "Dólar"
                        currencySymbol = "$"
                        break
                    case "JPY":
                        currencyType = "Iene"
                        currencySymbol = "¥"
                        break
                }
                let arrayDateUpdated = data[convertion].create_date.split(" ")[0].split("-")
                let hourUpdated = data[convertion].create_date.split(" ")[1]
                convertResponse.convertion.push({
                    currency: currencyType,
                    convertion_name : data[convertion].name,
                    value_converted : (data[convertion].bid * value).toFixed(2),
                    value_converted_formatted : `${currencySymbol} ${(data[convertion].bid * value).toFixed(2)}`,
                    updated: `${arrayDateUpdated[2]}/${arrayDateUpdated[1]}/${arrayDateUpdated[0]} às ${hourUpdated}`
                })
            }

            resolve(convertResponse)
        }).catch(()=>{
            throw new Error('Houve um erro no servidor de conversão de moedas')
        })
    })
}


export function cardsAgainstHumanity(){
    return new Promise <string> ((resolve)=>{
        const URL_BASE = 'https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/df5eee4e8abedbf1a18f031873d33f1e34ac338a/cartas.json'
        axios.get(URL_BASE).then(async ({data : cards})=>{
            let blackCardChosen = cards.cartas_pretas[Math.floor(Math.random() * cards.cartas_pretas.length)]
            let cont_params = 1

            if(blackCardChosen.indexOf("{p3}") != -1){
                cont_params = 3
            } else if(blackCardChosen.indexOf("{p2}") != -1){
                cont_params = 2
            }     

            for(let i = 1; i <= cont_params; i++){
                let whiteCardChosen = cards.cartas_brancas[Math.floor(Math.random() * cards.cartas_brancas.length)]
                blackCardChosen = blackCardChosen.replace(`{p${i}}`, `*${whiteCardChosen}*`)
                cards.cartas_brancas.splice(cards.cartas_brancas.indexOf(whiteCardChosen, 1))
            }

            resolve(blackCardChosen)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor para obter as cartas.")
        })
    })

}

export function infoDDD(ddd: string){
    return new Promise <DDD> ((resolve) =>{
        const URL_BASE = 'https://gist.githubusercontent.com/victorsouzaleal/ea89a42a9f912c988bbc12c1f3c2d110/raw/af37319b023503be780bb1b6a02c92bcba9e50cc/ddd.json'
        axios.get(URL_BASE).then(({data})=>{
            const states = data.estados
            const indexDDD = states.findIndex((state : { ddd: string }) =>{
                state.ddd.includes(ddd)
            }) 

            if(indexDDD === -1){
                throw new Error("Este DDD não foi encontrado, certifique-se que ele é válido.")
            }
                
            resolve({
                state: states[indexDDD].nome,
                region: states[indexDDD].regiao
            })
        }).catch(()=>{
            throw new Error("Houve um erro no servidor para obter os dados do DDD.")
        })
    })
}

export function symbolsASCI(){
    return new Promise <string> ((resolve)=>{
        const URL_BASE = 'https://gist.githubusercontent.com/victorsouzaleal/9a58a572233167587e11683aa3544c8a/raw/aea5d03d251359b61771ec87cb513360d9721b8b/tabela.txt'
        axios.get(URL_BASE).then(({data})=>{
            resolve(data)
        }).catch(()=>{
            throw new Error('Houve um erro para obter os dados, tente novamente mais tarde.')
        })
    })
}

export function truthMachine(){
    return new Promise<TruthMachine>(resolve =>{
        const FILENAMES = ["conversapraboi.png", "estresse.png", "incerteza.png", "kao.png", "meengana.png", "mentiroso.png", "vaipra.png", "verdade.png"]
        const calibrationImageBuffer = fs.readFileSync(path.join(mediaPath, 'calibrando.png'))
        const filenameChosen = FILENAMES[Math.floor(Math.random() * FILENAMES.length)]
        const resultImageBuffer = fs.readFileSync(path.join(mediaPath, filenameChosen))
        resolve({
            calibration: calibrationImageBuffer,
            result: resultImageBuffer
        })
    })
}

export function flipCoin(){
    return new Promise<Buffer>(resolve =>{
        const FILENAMES = ['cara.png', 'coroa.png']
        const filenameChosen = FILENAMES[Math.floor(Math.random() * FILENAMES.length)]
        const resultImageBuffer = fs.readFileSync(path.join(mediaPath, filenameChosen))
        resolve(resultImageBuffer)
    })
}



