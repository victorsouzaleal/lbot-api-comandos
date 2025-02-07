import axios from 'axios'
import {prettyNum} from 'pretty-num'
import { rastrearEncomendas, RastreioEvent } from 'correios-brasil'
import translate from '@vitalets/google-translate-api'
import google from '@victorsouzaleal/googlethis'
import { OrganicResult, search } from 'google-sr'
import Genius from 'genius-lyrics'
import qs from 'querystring'
import { timestampParaData } from '../lib/util.js'
import {obterDadosBrasileiraoA, obterDadosBrasileiraoB} from '@victorsouzaleal/brasileirao'
import {JSDOM} from 'jsdom'
import UserAgent from 'user-agents'

interface RespostaAnimesLancamento {
    resultado?: {nome: string, episodio: string, link: string}[]
    erro?: string
}

export const obterAnimesLancamento = async()=>{
    return new Promise <RespostaAnimesLancamento> (async(resolve, reject) =>{
        try{
            let resposta : RespostaAnimesLancamento = {}
            const URL_BASE = 'https://animefire.plus/'
            const {data} = await axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}})
            const {window:{document}} = new JSDOM(data)
            const $animes = document.querySelectorAll('div.divCardUltimosEpsHome')
            let animes : any[] = []
            $animes.forEach($anime =>{
                animes.push({
                    nome: $anime.querySelector('h3')?.innerHTML,
                    episodio: $anime.querySelector('span.numEp')?.innerHTML,
                    link: $anime.querySelector('a')?.href
                })
            })
            resposta.resultado = animes
            resolve(resposta)
        } catch(err : any){
            console.log(`API obterAnimesLancamento - ${err.message}`)
            reject({erro: 'Houve um erro no servidor para obter os lançamentos de animes.'})
        }
    })
}


interface RespostaMangasLancamento {
    resultado?: {nome: string, capitulo: string, link: string}[]
    erro?: string
}

export const obterMangasLancamento = async()=>{
    return new Promise <RespostaMangasLancamento> (async(resolve, reject) =>{
        try{
            let resposta : RespostaMangasLancamento = {}
            const URL_BASE = 'https://mangabr.net/'
            const {data} = await axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}})
            const {window:{document}} = new JSDOM(data)
            const $mangas = document.querySelectorAll('div.col-6.col-sm-3.col-md-3.col-lg-2.p-1')
            let mangas : any[] = []
            $mangas.forEach($manga =>{
                mangas.push({
                    nome: $manga.querySelector('h3.chapter-title > span.series-name')?.innerHTML.trim(),
                    capitulo: $manga.querySelector('h3.chapter-title > span.chapter-name')?.innerHTML.trim(),
                    link: `https://mangabr.net${$manga.querySelector('a.link-chapter')?.getAttribute('href')}`  
                })
            })
            resposta.resultado = mangas
            resolve(resposta)
        } catch(err : any){
            console.log(`API obterMangasLancamento - ${err.message}`)
            reject({erro: 'Houve um erro no servidor para obter os lançamentos de mangás.'})
        }
    })
}


interface RespostaBrasileirao {
    resultado?: {tabela: {}[], rodada_atual: {}, rodadas: {}[]}
    erro?: string
}

export const obterDadosBrasileirao = async(serie = "A")=>{
    return new Promise <RespostaBrasileirao>(async(resolve,reject)=>{
        try{
            let resposta : RespostaBrasileirao = {}
            let dadosBrasileirao
            if(serie === 'A') dadosBrasileirao = await obterDadosBrasileiraoA()
            else if(serie === 'B') dadosBrasileirao = await obterDadosBrasileiraoB()
            else {
                resposta.erro = "A série inserida não é suportada, apenas A e B."
                reject(resposta)
            }

            resposta.resultado = {
                tabela: dadosBrasileirao.tabela,
                rodada_atual: dadosBrasileirao.rodadas.filter((rodada: {rodada_atual: boolean})=> rodada.rodada_atual == true),
                rodadas: dadosBrasileirao.rodadas  
            }
            resolve(resposta)
        } catch(err : any){
            console.log(`API obterDadosBrasileirao - ${err.message}`)
            reject({erro: `Houve um erro ao obter os dados da tabela do Brasileirão no servidor.`})
        }
    })
}


interface RespostaTendenciasDia {
    resultado?: string,
    erro?: string
}

export const top20TendenciasDia = async(tipo = 'filmes')=>{
    return new Promise <RespostaTendenciasDia> (async(resolve,reject)=>{
        try{
            let resposta : RespostaTendenciasDia = {}
            let num = 0
            switch(tipo){
                case "filmes":
                    tipo = "movie"
                    break
                case "series":
                    tipo = "tv"
                    break
            }
            await axios.get(`https://api.themoviedb.org/3/trending/${tipo}/day?api_key=6618ac868ff51ffa77d586ee89223f49&language=pt-BR`)
            .then(({data})=>{
                const dados = data.results.map((item: { title: string; name: string; overview: string })=>{
                    num++;
                    return `${num}°: *${item.title || item.name}.*\n\`Sinopse:\` ${item.overview} \n`
                    }).join('\n');
                resposta.resultado = dados
                resolve(resposta)
            }).catch(() =>{
                resposta.erro = `Houve um erro no servidor ao listar ${tipo === 'movie' ? "os filmes":tipo === 'tv' && "as séries"}.`
                reject(resposta)
            })
        } catch(err: any){
            console.log(`API top20TendenciasDia- ${err.message}`)
            reject({erro: `Houve um erro no servidor ao listar ${tipo === 'movie' ? "os filmes":tipo === 'tv' && "as séries"}.`})
        }
    })
}


interface RespostaCalculo {
    resultado?: string,
    erro?: string
}

export const obterCalculo = async (expressao: string) =>{
    return new Promise <RespostaCalculo> (async (resolve, reject)=>{
        try{
            let resposta: RespostaCalculo = {}
            expressao = expressao.replace(/[Xx\xD7]/g, "*")
            expressao = expressao.replace(/\xF7/g, "/")
            expressao = expressao.replace(/,/g,".")
            expressao = expressao.replace("em","in")
            await axios.post(`https://api.mathjs.org/v4/`,{expr: expressao}).then((res)=>{
                let resultado = res.data.result
                if(resultado == "NaN" || resultado == "Infinity"){
                    resposta.erro = 'Foi feita uma divisão por 0 ou algum outro cálculo inválido.'
                    reject(resposta)
                }
                resultado = resultado.split(" ")
                resultado[0] = (resultado[0].includes("e")) ? prettyNum(resultado[0]) : resultado[0]
                resposta.resultado = resultado.join(" ")
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = 'Houve um erro no servidor de cálculo.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterCalculo- ${err.message}`)
            reject({erro: 'Houve um erro no servidor de cálculo.'})
        }
    })
}


interface RespostaNoticias {
    resultado?: {
        titulo: string,
        publicadoHa: string,
        autor: string,
        url: string
    }[],
    erro?: string
}

export const obterNoticias = async ()=>{
    return new Promise <RespostaNoticias> (async(resolve,reject)=>{
        try {
            let resposta : RespostaNoticias = {}
            await google.getTopNews('pt').then((listaNoticias)=>{
                resposta.resultado = []
                for(let noticia of listaNoticias.headline_stories){
                    resposta.resultado.push({
                        titulo : noticia.title,
                        publicadoHa : noticia.published,
                        autor: noticia.by,
                        url : noticia.url
                    })
                }
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Houve um erro no servidor de notícias."
                reject(resposta)
            })
        } catch(err: any){
            console.log(`API obterNoticias - ${err.message}`)
            reject({erro: "Houve um erro no servidor de notícias."})
        }
    })
}


interface RespostaTraducao {
    resultado?: string,
    erro?: string
}

export const obterTraducao = async (texto: string, idioma: string)=>{
    return new Promise <RespostaTraducao> (async (resolve, reject)=>{
        try {
            let resposta : RespostaTraducao = {}
            await translate(texto , {to: idioma}).then((res)=>{
                resposta.resultado = res.text
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Houve um erro em processar a tradução."
                reject(resposta)
            })
        } catch(err: any){
            console.log(`API obterTraducao - ${err.message}`)
            reject({erro: "Houve um erro em processar a tradução."})
        }
    })
}


interface RespostaEncurtar {
    resultado?: string,
    erro?: string
}

export const encurtarLink = async(link: string)=>{
    return new Promise <RespostaEncurtar> (async (resolve, reject)=>{
        try{
            let resposta : RespostaEncurtar = {}
            await axios.post("https://shorter.me/page/shorten", qs.stringify({url : link, alias: '', password: ''})).then(({data})=>{
                if(!data.data){
                    resposta.erro = `O link que você inseriu é inválido.`
                    reject(resposta)
                } else {
                    resposta.resultado = data.data
                    resolve(resposta)
                }
            }).catch(err =>{
                resposta.erro = `Houve um erro no servidor do encurtador de link.`
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API encurtarLink - ${err.message}`)
            reject({erro: `Houve um erro no servidor do encurtador de link`})
        }
    })
}


interface RespostaRastreio {
    resultado?: RastreioEvent,
    erro?: string
}

export const obterRastreioCorreios = async (codigoRastreio: string) =>{
    return new Promise <RespostaRastreio> (async (resolve,reject)=>{
        try{
            let resposta : RespostaRastreio = {}
            await rastrearEncomendas([codigoRastreio]).then((res)=>{
                if(!res) {
                    resposta.erro = 'Parece que este objeto ainda não foi postado ou não existe'
                    reject(resposta)
                } else {
                    resposta.resultado = res[0]
                    resolve(resposta)
                }
            })
        } catch(err : any){
            console.log(`API obterRastreioCorreios - ${err.message}`)
            reject({erro: "Houve um erro no servidor dos Correios."})
        }  
    })
}


interface RespostaPesquisaWeb {
    resultado?: {
        titulo: string | null,
        link: string | null,
        descricao: string | null
    }[],
    erro?: string
}

export const obterPesquisaWeb = async (texto: string) =>{
    return new Promise <RespostaPesquisaWeb> (async (resolve, reject)=>{
        try{
            let resposta: RespostaPesquisaWeb = {}

            const pesquisaResultado = await search({
                query: texto,
                resultTypes: [OrganicResult],
                requestConfig: {
                    params: {
                      safe: "off",
                    },
                  },
            })

            if(pesquisaResultado.length == 0){
                resposta.erro = "Não foram encontrados resultados para esta pesquisa."
                reject(resposta)
            } else {
                resposta.resultado = []
                for(let resultado of pesquisaResultado){
                    resposta.resultado.push({
                        titulo: resultado.title,
                        link: resultado.link,
                        descricao : resultado.description
                    })
                }
                resolve(resposta)
            }
        } catch(err : any) {
            console.log(`API obterPesquisaWeb - ${err.message}`)
            reject({erro: "Houve um erro no servidor de pesquisa."})
        }
    })
}


interface RespostaClima{
    resultado?: {
        local: {
            nome: string,
            estado: string,
            pais: string,
            horario_atual: string
        },
        atual: {
            ultima_atualizacao: string,
            temp: string,
            sensacao: string,
            condicao: string,
            vento: string,
            umidade: string,
            nuvens: string
        },
        previsao: {
            data : string,
            max: string,
            min: string,
            media: string,
            condicao: string,
            max_vento: string,
            chuva : string,
            chance_chuva : string,
            neve: string,
            chance_neve : string,
            uv: number
        }[]
    },
    erro?: string
}

interface WheatherResult {
    location: {
        name: string,
        region: string,
        country: string,
        localtime_epoch: number
    },
    current: {
        last_updated_epoch: number,
        temp_c: number,
        feelslike_c: number,
        is_day: number,
        wind_kph: number,
        humidity: number,
        cloud: number,
        condition: {
            code: number
        }
    },
    forecast: {
        forecastday:{
            date: string,
            day:{
                maxtemp_c: number,
                mintemp_c: number,
                avgtemp_c: number,
                maxwind_kph: number,
                daily_will_it_rain: number,
                daily_chance_of_rain: number
                daily_will_it_snow: number,
                daily_chance_of_snow: number,
                uv: number,
                condition: {
                    code: number
                }
            }
        }[]
    }
}

export const obterClima = async (local: string) =>{
    return new Promise <RespostaClima> (async (resolve, reject)=>{
        try{
            let resposta: RespostaClima = {}
            const climaAPIURL = `http://api.weatherapi.com/v1/forecast.json?key=516f58a20b6c4ad3986123104242805&q=${encodeURIComponent(local)}&days=3&aqi=no&alerts=no`
            await axios.get(climaAPIURL).then(async (res)=>{
                let dadosClima : WheatherResult  = res.data
            
                const {data: condicoesClima} = await axios.get("https://www.weatherapi.com/docs/conditions.json", {responseType: 'json'})
                const condicaoAtual = (condicoesClima.find((condicao: { code: number })=> condicao.code == dadosClima.current.condition.code)).languages.find((idioma: { lang_iso: string }) => idioma.lang_iso == 'pt')
                resposta.resultado = {
                    local: {
                        nome: dadosClima.location.name,
                        estado: dadosClima.location.region,
                        pais: dadosClima.location.country,
                        horario_atual: timestampParaData(dadosClima.location.localtime_epoch * 1000)
                    },
                    atual: {
                        ultima_atualizacao: timestampParaData(dadosClima.current.last_updated_epoch * 1000),
                        temp: `${dadosClima.current.temp_c} C°`,
                        sensacao: `${dadosClima.current.feelslike_c} C°`,
                        condicao: dadosClima.current.is_day ? condicaoAtual.day_text : condicaoAtual.night_text,
                        vento: `${dadosClima.current.wind_kph} Km/h`,
                        umidade: `${dadosClima.current.humidity} %`,
                        nuvens: `${dadosClima.current.cloud} %`
                    },
                    previsao: []
                }

                dadosClima.forecast.forecastday.forEach((previsao) => {
                    const condicaoDia = (condicoesClima.find((condicao: { code: number })=> condicao.code == previsao.day.condition.code)).languages.find((idioma: { lang_iso: string }) => idioma.lang_iso == 'pt')
                    const [ano, mes, dia] = previsao.date.split("-")
                    const dadosPrevisao = {
                        data : `${dia}/${mes}/${ano}`,
                        max: `${previsao.day.maxtemp_c} C°`,
                        min: `${previsao.day.mintemp_c} C°`,
                        media: `${previsao.day.avgtemp_c} C°`,
                        condicao: `${condicaoDia.day_text}`,
                        max_vento: `${previsao.day.maxwind_kph} Km/h`,
                        chuva : `${previsao.day.daily_will_it_rain ? "Sim" : "Não"}`,
                        chance_chuva : `${previsao.day.daily_chance_of_rain} %`,
                        neve: `${previsao.day.daily_will_it_snow ? "Sim" : "Não"}`,
                        chance_neve : `${previsao.day.daily_chance_of_snow} %`,
                        uv: previsao.day.uv
                    }
                    resposta.resultado?.previsao.push(dadosPrevisao)
                })
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Houve um erro no servidor de pesquisa de clima."
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterClima - ${err.message}`)
            reject({erro: "Houve um erro no servidor de pesquisa de clima."})
        }
    })
}


interface RespostaLetraMusica {
    resultado?: {
        titulo: string,
        artista: string,
        imagem: string,
        letra: string
    },
    erro?: string
}

export const obterLetraMusica = async (texto: string) =>{
    return new Promise <RespostaLetraMusica> (async (resolve,reject)=>{
        try{
            let resposta : RespostaLetraMusica = {}
            const Client = new Genius.Client()
            await Client.songs.search(texto).then(async (pesquisaMusica)=>{
                if(pesquisaMusica.length == 0) {
                    resposta.erro = "A letra da música não foi encontrada"
                    reject(resposta)
                } else {
                    let letraMusica = await pesquisaMusica[0].lyrics()
                    resposta.resultado = {
                        titulo: pesquisaMusica[0].title,
                        artista: pesquisaMusica[0].artist.name,
                        imagem : pesquisaMusica[0].artist.image,
                        letra: letraMusica
                    }
                    resolve(resposta)
                }
            }).catch((err)=>{
                if(err.message == "No result was found"){
                    resposta.erro = "A letra da música não foi encontrada"
                    reject(resposta)
                } else {
                    resposta.erro = "Houve um erro no servidor para obter a letra da música."
                    reject(resposta)
                }
            })
        } catch(err : any){
            console.log(`API obterLetraMusica - ${err.message}`)
            reject({erro: "Houve um erro no servidor para obter a letra da música."})
        }
    })
}


interface RespostaConversaoMoeda {
    resultado?: {
        valor_inserido : number,
        moeda_inserida: string,
        conversao : {
            tipo: string,
            conversao : any,
            valor_convertido : string,
            valor_convertido_formatado : string,
            atualizacao: string
        }[]
    },
    erro?: string
}

export const obterConversaoMoeda = async (moeda: string, valor: number)=>{
    return new Promise <RespostaConversaoMoeda> (async (resolve, reject)=>{
        try {
            let resposta : RespostaConversaoMoeda = {}
            const moedasSuportadas = ['dolar','euro', 'real']
            moeda = moeda.toLowerCase()
            valor = parseInt(valor.toString().replace(",","."))

            if(!moedasSuportadas.includes(moeda)){
                resposta.erro = 'Moeda não suportada, atualmente existe suporte para : real|dolar|euro'
                reject(resposta)
            }
            if(isNaN(valor)){
                resposta.erro = 'O valor não é um número válido'
                reject(resposta)
            } 
            if(valor > 1000000000000000){
                resposta.erro = 'Quantidade muito alta, você provavelmente não tem todo esse dinheiro.'
                reject(resposta)
            } 

            let params = ''
            switch(moeda){
                case 'dolar':
                    moeda = (valor > 1) ? "Dólares" : "Dólar"
                    params = "USD-BRL,USD-EUR,USD-JPY"
                    break
                case 'euro':
                    moeda = (valor > 1) ? "Euros" : "Euro"
                    params = "EUR-BRL,EUR-USD,EUR-JPY"
                    break
                case 'iene':
                    moeda = (valor > 1) ? "Ienes" : "Iene"
                    params= "JPY-BRL,JPY-USD,JPY-EUR"
                    break 
                case 'real':
                    moeda = (valor > 1) ? "Reais" : "Real"
                    params= "BRL-USD,BRL-EUR,BRL-JPY"
                    break                  
            }
            await axios.get(`https://economia.awesomeapi.com.br/json/last/${params}`).then(({data})=>{
                resposta.resultado = {
                    valor_inserido : valor,
                    moeda_inserida: moeda,
                    conversao : []
                }
                
                for (let conversao in data){
                    let nomeMoeda = '', tipoMoeda = '', simbolo = ''
                    switch(data[conversao].codein){
                        case "BRL":
                            tipoMoeda = "Real/Reais"
                            nomeMoeda = "real"
                            simbolo = "R$"
                            break
                        case "EUR":
                            tipoMoeda = "Euro/Euros"
                            nomeMoeda = "euro"
                            simbolo = "Є"
                            break
                        case "USD":
                            tipoMoeda = "Dólar/Dólares"
                            nomeMoeda = "dolar"
                            simbolo = "$"
                            break
                        case "JPY":
                            tipoMoeda = "Iene/Ienes"
                            nomeMoeda = 'iene'
                            simbolo = "¥"
                            break
                    }
                    let dataHoraAtualizacao = data[conversao].create_date.split(" ")
                    let dataAtualizacao = dataHoraAtualizacao[0].split("-"), horaAtualizacao = dataHoraAtualizacao[1]
                    resposta.resultado.conversao.push({
                        tipo: tipoMoeda,
                        conversao : data[conversao].name,
                        valor_convertido : (data[conversao].bid * valor).toFixed(2),
                        valor_convertido_formatado : `${simbolo} ${(data[conversao].bid * valor).toFixed(2)}`,
                        atualizacao: `${dataAtualizacao[2]}/${dataAtualizacao[1]}/${dataAtualizacao[0]} às ${horaAtualizacao}`
                    })
                    resolve(resposta)
                }
            }).catch(()=>{
                resposta.erro = 'Houve um erro no servidor de conversão de moedas'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterConversaoMoeda - ${err.message}`)
            reject({erro: 'Houve um erro no servidor de conversão de moedas'})
        }
    })
}


interface RespostaCartasContraHu {
    resultado?: string
    erro?: string
}

export const obterCartasContraHu = async()=>{
    return new Promise <RespostaCartasContraHu> (async (resolve, reject)=>{
        try {
            let resposta : RespostaCartasContraHu = {}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/df5eee4e8abedbf1a18f031873d33f1e34ac338a/cartas.json").then(async (github_gist_cartas)=>{
                let cartas = github_gist_cartas.data, cartaPretaAleatoria = Math.floor(Math.random() * cartas.cartas_pretas.length), cartaPretaEscolhida = cartas.cartas_pretas[cartaPretaAleatoria], cont_params = 1
                if(cartaPretaEscolhida.indexOf("{p3}") != -1) cont_params = 3
                else if(cartaPretaEscolhida.indexOf("{p2}") != -1) cont_params = 2
                else cont_params = 1
                for(let i = 1; i <= cont_params; i++){
                    let cartaBrancaAleatoria = Math.floor(Math.random() * cartas.cartas_brancas.length)
                    let cartaBrancaEscolhida = cartas.cartas_brancas[cartaBrancaAleatoria]
                    cartaPretaEscolhida = cartaPretaEscolhida.replace(`{p${i}}`, `*${cartaBrancaEscolhida}*`)
                    cartas.cartas_brancas.splice(cartas.cartas_brancas.indexOf(cartaBrancaEscolhida, 1))
                }
                resposta.resultado = cartaPretaEscolhida
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Houve um erro no servidor para obter as cartas."
                reject(resposta)
            })
        } catch(err: any){
            console.log(`API obterCartasContraHu- ${err.message}`)
            reject({erro: "Houve um erro no servidor para obter as cartas."})
        }
    })

}


interface RespostaInfoDDD {
    resultado?: {
        estado: string,
        regiao: string
    }
    erro?: string
}

export const obterInfoDDD = async(ddd: string)=>{
    return new Promise <RespostaInfoDDD> (async (resolve, reject)=>{
        try {
            let resposta : RespostaInfoDDD = {}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/ea89a42a9f912c988bbc12c1f3c2d110/raw/af37319b023503be780bb1b6a02c92bcba9e50cc/ddd.json").then(async githubGistDDD=>{
                let estados = githubGistDDD.data.estados
                let indexDDD = estados.findIndex((estado: { ddd: string }) => estado.ddd.includes(ddd))
                if(indexDDD != -1){
                    resposta.resultado = {
                        estado: estados[indexDDD].nome,
                        regiao: estados[indexDDD].regiao
                    }
                    resolve(resposta)
                } else {
                    resposta.erro = 'Este DDD não foi encontrado, certifique-se que ele é válido.'
                    reject(resposta)
                }
            }).catch(()=>{
                resposta.erro = 'Houve um erro para obter dados sobre este DDD, tente novamente mais tarde.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterInfoDDD - ${err.message}`)
            reject({erro: 'Houve um erro para obter dados sobre este DDD, tente novamente mais tarde.'})
        }
    })
}


interface RespostaTabelaNick {
    resultado?: string,
    erro?: string
}

export const obterTabelaNick = async()=>{
    return new Promise <RespostaTabelaNick> (async(resolve,reject)=>{
        try{
            let resposta: RespostaTabelaNick = {}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/9a58a572233167587e11683aa3544c8a/raw/aea5d03d251359b61771ec87cb513360d9721b8b/tabela.txt").then((githubGistTabela)=>{
                resposta.resultado = githubGistTabela.data
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = 'Houve um erro para obter os dados, tente novamente mais tarde.'
                reject(resposta)
            })
        } catch(err : any){
            console.log(`API obterTabelaNick - ${err.message}`)
            reject({erro: 'Houve um erro para obter os dados, tente novamente mais tarde.'})
        }
    })
}



