const amqp = require('amqplib');
const sqlite3 = require('sqlite3').verbose();

// Conexão e criação do banco de dados SQLite
const db = new sqlite3.Database('./movies.db');

// Função para adicionar filme ao banco de dados
function addMovieToDatabase(title) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO movies (name) VALUES (?)', [title], function (err) {
      if (err) {
        console.error('Erro ao adicionar filme ao banco de dados:', err);
        reject(err);
      } else {
        console.log(`Filme "${title}" adicionado ao banco de dados.`);
        resolve();
      }
    });
  });
}

// Função para remover filme do banco de dados
function removeMovieFromDatabase(title) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM movies WHERE name = ?', [title], function (err) {
      if (err) {
        console.error('Erro ao remover filme do banco de dados:', err);
        reject(err);
      } else if (this.changes === 0) {
        console.log(`Filme "${title}" não encontrado no banco de dados.`);
        reject(new Error('Filme não encontrado'));
      } else {
        console.log(`Filme "${title}" removido do banco de dados.`);
        resolve();
      }
    });
  });
}

// Função para consumir mensagens da fila do RabbitMQ
async function startConsumer() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    // Consome mensagens da fila de adição de filmes
    await channel.assertQueue('add_movie_queue', { durable: true });
    channel.consume('add_movie_queue', async (msg) => {
      const content = JSON.parse(msg.content.toString());
      const title = content.title;
      console.log(`Consumindo mensagem de adição de filme: ${title}`);
      try {
        await addMovieToDatabase(title);
        channel.ack(msg);
      } catch (err) {
        console.error('Erro ao processar adição de filme:', err);
      }
    });

    // Consome mensagens da fila de remoção de filmes
    await channel.assertQueue('remove_movie_queue', { durable: true });
    channel.consume('remove_movie_queue', async (msg) => {
      const content = JSON.parse(msg.content.toString());
      const title = content.title;
      console.log(`Consumindo mensagem de remoção de filme: ${title}`);
      try {
        await removeMovieFromDatabase(title);
        channel.ack(msg);
      } catch (err) {
        console.error('Erro ao processar remoção de filme:', err);
      }
    });

    console.log('Consumidor esperando por mensagens...');
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
  }
}

// Inicia o consumidor
startConsumer();
