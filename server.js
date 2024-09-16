// server.js
const WebSocket = require('ws');
const axios = require('axios');
const { saveMovie, getMovies } = require('./database');

const wss = new WebSocket.Server({ port: 8080 });

// URL do gateway
const GATEWAY_URL = 'http://localhost:3000/fetch-movie';

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const searchQuery = message.toString().trim();
    console.log(`Recebida palavra-chave: ${searchQuery}`);

    // Faz requisição para o Gateway, que chama a OMDb API
    try {
      const response = await axios.get(`${GATEWAY_URL}?title=${searchQuery}`);
      const movie = response.data;

      if (movie.title) {
        const movieName = movie.title;

        // Salva o nome do filme no banco de dados
        const savedMovie = await saveMovie(movieName);

        // Notifica todos os clientes conectados
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(`Filme adicionado ao catálogo: ${savedMovie.name}`);
          }
        });
      } else {
        ws.send('Nenhum filme encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar filme:', error);
      ws.send('Erro ao buscar filme.');
    }
  });

  // Enviar os filmes atuais no banco de dados quando um cliente se conecta
  ws.on('open', async () => {
    const movies = await getMovies();
    ws.send(`Filmes no catálogo: ${movies.map(movie => movie.name).join(', ')}`);
  });
});

console.log('Servidor WebSocket rodando na porta 8080');
