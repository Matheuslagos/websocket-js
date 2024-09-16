const express = require('express');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const OMDB_API_KEY = '16256300';

// Middleware para analisar JSON
app.use(express.json());

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OMDb Gateway API',
      version: '1.0.0',
      description: 'API Gateway que busca informações de filmes da OMDb API',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./gateway.js'], // arquivos onde estão as rotas documentadas
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Cria e abre o banco de dados SQLite3 persistente
const db = new sqlite3.Database('./movies.db');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS movies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
});

// Rota para buscar o filme na API OMDb
/**
 * @swagger
 * /fetch-movie:
 *   get:
 *     summary: Busca informações sobre um filme usando a API OMDb
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         required: true
 *         description: Nome do filme a ser buscado
 *     responses:
 *       200:
 *         description: Retorna o título do filme
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   description: Título do filme retornado
 *       404:
 *         description: Filme não encontrado
 *       500:
 *         description: Erro no servidor
 */
app.get('/fetch-movie', (req, res) => {
  const searchQuery = req.query.title;

  if (!searchQuery) {
    return res.status(400).json({ error: 'Parâmetro "title" é obrigatório' });
  }

  axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${searchQuery}`)
    .then(response => {
      const movie = response.data;

      if (movie.Response === 'True') {
        res.json({
          title: movie.Title,
          _links: {
            self: { href: `http://localhost:${PORT}/fetch-movie?title=${searchQuery}` },
            delete: { href: `http://localhost:${PORT}/delete-movie?title=${searchQuery}` }
          }
        });
      } else {
        res.status(404).json({ error: 'Filme não encontrado' });
      }
    })
    .catch(error => {
      console.error('Erro ao buscar filme:', error);
      res.status(500).json({ error: 'Erro ao buscar filme' });
    });
});

// Rota para remover um filme do banco de dados
/**
 * @swagger
 * /delete-movie:
 *   delete:
 *     summary: Remove um filme do banco de dados pelo nome
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         required: true
 *         description: Nome do filme a ser removido
 *     responses:
 *       200:
 *         description: Filme removido com sucesso
 *       404:
 *         description: Filme não encontrado
 *       500:
 *         description: Erro no servidor
 */
app.delete('/delete-movie', (req, res) => {
  const title = req.query.title;

  if (!title) {
    return res.status(400).json({ error: 'Parâmetro "title" é obrigatório' });
  }

  db.run('DELETE FROM movies WHERE name = ?', [title], function(err) {
    if (err) {
      console.error('Erro ao remover filme:', err);
      return res.status(500).json({ error: 'Erro ao remover filme' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    res.status(200).json({
      message: 'Filme removido com sucesso',
      _links: {
        self: { href: `http://localhost:${PORT}/delete-movie?title=${title}` },
        fetch: { href: `http://localhost:${PORT}/fetch-movie?title=${title}` }
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Gateway rodando na porta ${PORT}`);
  console.log(`Acesse a documentação Swagger em http://localhost:${PORT}/api-docs`);
});
