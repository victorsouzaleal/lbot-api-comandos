import axios from 'axios'
import {prettyNum} from 'pretty-num'
import { rastrearEncomendas, RastreioEvent, RastreioResponse } from 'correios-brasil'
import translate from '@vitalets/google-translate-api'
import google from '@victorsouzaleal/googlethis'
import { OrganicResult, search } from 'google-sr'
import Genius from 'genius-lyrics'
import qs from 'querystring'
import { timestampParaData } from '../lib/util.js'
import {obterDadosBrasileiraoA, obterDadosBrasileiraoB, DadosBrasileirao} from '@victorsouzaleal/brasileirao'
import {JSDOM} from 'jsdom'
import UserAgent from 'user-agents'

interface InfoAnimesLancamento {
    nome: string,
    episodio: string,
    link: string
}

export function obterAnimesLancamento(){
    return new Promise<InfoAnimesLancamento[]>((resolve)=>{
        const URL_BASE = 'https://animefire.plus/'
        axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}})
        .then(({data})=>{
            const {window:{document}} = new JSDOM(data)
            const $animes = document.querySelectorAll('div.divCardUltimosEpsHome')
            let animes : InfoAnimesLancamento[] = []
            $animes.forEach($anime =>{
                let nome = $anime.querySelector('h3')?.innerHTML
                let episodio = $anime.querySelector('span.numEp')?.innerHTML
                let link = $anime.querySelector('a')?.href
                if(!nome || !episodio || !link) throw new Error("Houve um erro ao coletar os dados dos animes.")
                animes.push({
                    nome,
                    episodio,
                    link
                })
            })
            resolve(animes)
        })
        .catch(()=>{
            throw new Error("Houve um erro ao acessar o servidor de animes.")
        })
    })

}

interface InfoMangasLancamento {
    nome: string,
    capitulo: string,
    link: string
}

export function obterMangasLancamento(){
    return new Promise <InfoMangasLancamento[]> ((resolve) =>{
        const URL_BASE = 'https://mangabr.net/'
        axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}})
        .then(({data})=>{
            const {window:{document}} = new JSDOM(data)
            const $mangas = document.querySelectorAll('div.col-6.col-sm-3.col-md-3.col-lg-2.p-1')
            let mangas : InfoMangasLancamento[] = []
            $mangas.forEach($manga =>{
                let nome = $manga.querySelector('h3.chapter-title > span.series-name')?.innerHTML.trim()
                let capitulo = $manga.querySelector('h3.chapter-title > span.series-name')?.innerHTML.trim()
                let link = `https://mangabr.net${$manga.querySelector('a.link-chapter')?.getAttribute('href')}`
                if(!nome || !capitulo) throw new Error("Houve um erro ao coletar os dados dos mangás.") 
                mangas.push({
                    nome,
                    capitulo,
                    link
                })
            })
            resolve(mangas)
        })
        .catch(()=>{
            throw new Error("Houve um erro ao acessar o servidor de mangás.")
        })
    })
}


export function obterDadosBrasileirao(serie : "A" | "B"){
    return new Promise <DadosBrasileirao>(async(resolve)=>{
        const dadosBrasileirao = (serie == "A") ? await obterDadosBrasileiraoA() : await obterDadosBrasileiraoB()
        resolve(dadosBrasileirao)
    })
}

export function top20TendenciasDia(tipo : 'filmes' | 'series' = "filmes"){
    return new Promise <string> ((resolve,reject)=>{
        let num = 0
        const tipoAPI = (tipo == 'filmes') ? 'movie' : 'tv'
        axios.get(`https://api.themoviedb.org/3/trending/${tipoAPI}/day?api_key=6618ac868ff51ffa77d586ee89223f49&language=pt-BR`)
        .then(({data})=>{
            const dados : string = data.results.map((item: { title: string; name: string; overview: string })=>{
                num++;
                return `${num}°: *${item.title || item.name}.*\n\`Sinopse:\` ${item.overview} \n`
            }).join('\n')
            resolve(dados)
        }).catch(() =>{
            throw new Error(`Houve um erro no servidor ao listar ${tipo === 'filmes' ? "os filmes" : "as séries"}.`)
        })
    })
}

export function obterCalculo(expressao: string){
    return new Promise <string> (async (resolve)=>{
        expressao = expressao.replace(/[Xx\xD7]/g, "*")
        expressao = expressao.replace(/\xF7/g, "/")
        expressao = expressao.replace(/,/g,".")
        expressao = expressao.replace("em","in")
        await axios.post(`https://api.mathjs.org/v4/`,{expr: expressao}).then((res)=>{
            let resultado = res.data.result
            if(resultado == "NaN" || resultado == "Infinity"){
                throw new Error('Foi feita uma divisão por 0 ou algum outro cálculo inválido.')
            }
            resultado = resultado.split(" ")
            resultado[0] = (resultado[0].includes("e")) ? prettyNum(resultado[0]) : resultado[0]
            resolve(resultado.join(" "))
        }).catch(()=>{
            throw new Error('Houve um erro ao acessar o servidor de cálculo.')
        })
    })
}


interface InfoNoticias {
    titulo: string,
    publicadoHa: string,
    autor: string,
    url: string
}

export function obterNoticias(){
    return new Promise <InfoNoticias[]> ((resolve)=>{
        google.getTopNews('pt').then((listaNoticias)=>{
            let noticias : InfoNoticias[] = []
            for(let noticia of listaNoticias.headline_stories){
                noticias.push({
                    titulo : noticia.title,
                    publicadoHa : noticia.published,
                    autor: noticia.by,
                    url : noticia.url
                })
            }
            resolve(noticias)
        }).catch(()=>{
            throw new Error ("Houve um erro no servidor de notícias.")
        })
    })
}

export function obterTraducao(texto: string, idioma: string){
    return new Promise <string> ((resolve)=>{
        translate(texto , {to: idioma}).then((res)=>{
            resolve(res.text)
        }).catch(()=>{
            throw new Error('Houve um erro em processar a tradução.')
        })
    })
}

export function encurtarLink(link: string){
    return new Promise <string> (async (resolve, reject)=>{
        axios.post("https://shorter.me/page/shorten", qs.stringify({url : link, alias: '', password: ''})).then(({data})=>{
            if(!data.data) throw new Error(`O link que você inseriu é inválido.`)
            resolve(data.data)
        }).catch(() =>{
            throw new Error(`Houve um erro no servidor do encurtador de link.`)
        })
    })
}


export function obterRastreioCorreios(codigoRastreio: string){
    return new Promise <RastreioResponse> (async (resolve,reject)=>{
        rastrearEncomendas([codigoRastreio]).then((res)=>{
            if(!res) throw new Error('Parece que este objeto ainda não foi postado ou não existe')
            resolve(res)
        })
    })
}


interface InfoPesquisaWeb {
    titulo: string | null,
    link: string | null,
    descricao: string | null
}

export function obterPesquisaWeb(texto: string){
    return new Promise <InfoPesquisaWeb[]> (async (resolve)=>{
            const resultadosPesquisa = await search({
                query: texto,
                resultTypes: [OrganicResult],
                requestConfig: {
                    params: {
                      safe: "off",
                    },
                  },
            })

            if(resultadosPesquisa.length == 0) throw new Error ("Não foram encontrados resultados para esta pesquisa.")
            let resultados : InfoPesquisaWeb[] = []
            for(let resultado of resultadosPesquisa){
                resultados.push({
                    titulo: resultado.title,
                    link: resultado.link,
                    descricao : resultado.description
                })
            }
            resolve(resultados)
    })
}


interface InfoClima{
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

export function obterClima(local: string){
    return new Promise <InfoClima> ((resolve)=>{
        const climaAPIURL = `http://api.weatherapi.com/v1/forecast.json?key=516f58a20b6c4ad3986123104242805&q=${encodeURIComponent(local)}&days=3&aqi=no&alerts=no`
        axios.get(climaAPIURL).then(async (res)=>{
            let dadosClima : WheatherResult  = res.data
            const {data: condicoesClima} = await axios.get("https://www.weatherapi.com/docs/conditions.json", {responseType: 'json'})
            const condicaoAtual = (condicoesClima.find((condicao: { code: number })=> condicao.code == dadosClima.current.condition.code)).languages.find((idioma: { lang_iso: string }) => idioma.lang_iso == 'pt')
            let resultadoClima : InfoClima = {
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
                resultadoClima.previsao.push(dadosPrevisao)
            })
            resolve(resultadoClima)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor de pesquisa de clima.")
        })
    })
}


interface InfoLetraMusica {
    titulo: string,
    artista: string,
    imagem: string,
    letra: string
}

export function obterLetraMusica(texto: string){
    return new Promise <InfoLetraMusica> ((resolve)=>{
        const Client = new Genius.Client()
        Client.songs.search(texto).then(async (pesquisaMusica)=>{
            if(pesquisaMusica.length == 0) throw new Error("A letra da música não foi encontrada")
            let letraMusica = await pesquisaMusica[0].lyrics()
            resolve({
                titulo: pesquisaMusica[0].title,
                artista: pesquisaMusica[0].artist.name,
                imagem : pesquisaMusica[0].artist.image,
                letra: letraMusica
            })
        }).catch((err)=>{
            if(err.message == "No result was found") throw new Error("A letra da música não foi encontrada")
            throw new Error("Houve um erro no servidor para obter a letra da música.")
        })
    })
}


interface InfoConversaoMoeda {
    valor_inserido : number,
    moeda_inserida: string,
    conversao : {
        tipo: string,
        conversao : any,
        valor_convertido : string,
        valor_convertido_formatado : string,
        atualizacao: string
    }[]
}

export function obterConversaoMoeda(moeda: "dolar" | "euro" | "real" | "iene", valor: number){
    return new Promise <InfoConversaoMoeda> ((resolve)=>{
        valor = parseInt(valor.toString().replace(",","."))

        if(isNaN(valor)) throw new Error('O valor não é um número válido')
        if(valor > 1000000000000000) throw new Error('Quantidade muito alta, você provavelmente não tem todo esse dinheiro.')
        
        let params = '', nomeMoeda = ''
        switch(moeda){
            case 'dolar':
                nomeMoeda = (valor > 1) ? "Dólares" : "Dólar"
                params = "USD-BRL,USD-EUR,USD-JPY"
                break
            case 'euro':
                nomeMoeda = (valor > 1) ? "Euros" : "Euro"
                params = "EUR-BRL,EUR-USD,EUR-JPY"
                break
            case 'iene':
                nomeMoeda = (valor > 1) ? "Ienes" : "Iene"
                params= "JPY-BRL,JPY-USD,JPY-EUR"
                break 
            case 'real':
                nomeMoeda = (valor > 1) ? "Reais" : "Real"
                params= "BRL-USD,BRL-EUR,BRL-JPY"
                break                  
        }
        axios.get(`https://economia.awesomeapi.com.br/json/last/${params}`).then(({data})=>{
            let resultadoConversao : InfoConversaoMoeda = {
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
                resultadoConversao.conversao.push({
                    tipo: tipoMoeda,
                    conversao : data[conversao].name,
                    valor_convertido : (data[conversao].bid * valor).toFixed(2),
                    valor_convertido_formatado : `${simbolo} ${(data[conversao].bid * valor).toFixed(2)}`,
                    atualizacao: `${dataAtualizacao[2]}/${dataAtualizacao[1]}/${dataAtualizacao[0]} às ${horaAtualizacao}`
                })
            }

            resolve(resultadoConversao)
        }).catch(()=>{
            throw new Error('Houve um erro no servidor de conversão de moedas')
        })
    })
}


export function obterCartasContraHu(){
    return new Promise <string> ((resolve)=>{
        axios.get("https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/df5eee4e8abedbf1a18f031873d33f1e34ac338a/cartas.json").then(async (github_gist_cartas)=>{
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
            resolve(cartaPretaEscolhida)
        }).catch(()=>{
            throw new Error("Houve um erro no servidor para obter as cartas.")
        })
    })

}


interface InfoDDD {
    estado: string,
    regiao: string
}

export function obterInfoDDD(ddd: string){
    return new Promise <InfoDDD> ((resolve) =>{
            axios.get("https://gist.githubusercontent.com/victorsouzaleal/ea89a42a9f912c988bbc12c1f3c2d110/raw/af37319b023503be780bb1b6a02c92bcba9e50cc/ddd.json").then(async githubGistDDD=>{
                let estados = githubGistDDD.data.estados
                let indexDDD = estados.findIndex((estado: { ddd: string }) => estado.ddd.includes(ddd))
                if(indexDDD == -1) throw new Error("Este DDD não foi encontrado, certifique-se que ele é válido.")
                resolve({
                    estado: estados[indexDDD].nome,
                    regiao: estados[indexDDD].regiao
                })
            }).catch(()=>{
                throw new Error("Houve um erro no servidor para obter os dados do DDD.")
            })
    })
}

export function obterTabelaNick(){
    return new Promise <string> ((resolve)=>{
        axios.get("https://gist.githubusercontent.com/victorsouzaleal/9a58a572233167587e11683aa3544c8a/raw/aea5d03d251359b61771ec87cb513360d9721b8b/tabela.txt").then((githubGistTabela)=>{
            resolve(githubGistTabela.data)
        }).catch(()=>{
            throw new Error('Houve um erro para obter os dados, tente novamente mais tarde.')
        })
    })
}



