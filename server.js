const WebSocket = require('ws');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const wss = new WebSocket.Server({ port: 8080 });
const OMDB_API_KEY = '16256300';

// Cria e abre o banco de dados SQLite3 persistente
const db = new sqlite3.Database('./movies.db');

wss.on('connection', ws => {
  ws.on('message', async message => {
    const { action, title } = JSON.parse(message);

    if (action === 'fetch') {
      try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${title}`);
        const movie = response.data;

        if (movie.Response === 'True') {
          db.run('INSERT INTO movies (name) VALUES (?)', [movie.Title], function(err) {
            if (err) {
              console.error('Erro ao salvar filme:', err);
              return;
            }

            // Notificar todos os clientes sobre o novo filme
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'new_movie', title: movie.Title }));
              }
            });
          });
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Filme não encontrado' }));
        }
      } catch (error) {
        console.error('Erro ao buscar filme:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Erro ao buscar filme' }));
      }
    } else if (action === 'delete') {
      db.run('DELETE FROM movies WHERE name = ?', [title], function(err) {
        if (err) {
          console.error('Erro ao remover filme:', err);
          return;
        }

        if (this.changes === 0) {
          ws.send(JSON.stringify({ type: 'error', message: 'Filme não encontrado' }));
        } else {
          // Notificar todos os clientes sobre a remoção do filme
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'remove_movie', title }));
            }
          });
        }
      });
    }
  });
});

console.log('Servidor WebSocket rodando na porta 8080');
