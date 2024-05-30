# LBOT - API's para comandos
Conjunto de API's que são usados para os comandos do LBOT (https://github.com/victorsouzaleal/lbot-whatsapp)

### O projeto está aberto para quem quiser contribuir ou utilizar em um outro bot

## Instalação
NPM :
```bash
npm i lbot-api-comandos
```

Yarn :
```bash
yarn add lbot-api-comandos
```

## Importação e Uso

Importação :
```js
import api from 'lbot-api-comandos'
```

Uso: 
```js
//Ex: Gerais (Obter Noticias)
let {sucesso, resultado} = await api.Gerais.obterNoticias().catch(err => {console.log(err.erro)})
//Ex: Audio (Texto para Voz)
let {sucesso, resultado} = await api.Audios.textoParaVoz(idioma, texto).catch(err => {console.log(err.erro)})
//Ex: Downloads (Twitter)
let {sucesso, resultado} = await api.Downloads.obterMidiaTwitter(url).catch(err => {console.log(err.erro)})
//Ex : IA (GPT v3)
let {sucesso, resultado} = await api.IA.obterRespostaIA(texto).catch(err => {console.log(err.erro)})
//Ex : Imagens (Upload de imagem)
let {sucesso, resultado} = await api.Imagens.imagemUpload(bufferImagem).catch(err => {console.log(err.erro)})
//Ex: Videos (Converter para MP3)
let {sucesso, resultado} = await api.Videos.converterMp4ParaMp3(bufferVideo).catch(err => {console.log(err.erro)})
//Ex: Stickers (Criar sticker)
let {sucesso, resultado} = await api.Stickers.criarSticker(bufferMidia, opcoes).catch(err => {console.log(err.erro)})
```

Os resultados bem-sucedidos virão como :
```js
{
    sucesso: true,
    resultado: valor
}
```

Os resultados que tiverem erros virão como :
```js
{
    sucesso: false,
    erro: mensagem_erro
}
```

## Documentação
No momento não tenho uma documentação completa mas pretendo futuramente documentar cada função.
