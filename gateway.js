// gateway.js
const express = require('express');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000;
const OMDB_API_KEY = '16256300';

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
app.get('/fetch-movie', async (req, res) => {
  const searchQuery = req.query.title;

  if (!searchQuery) {
    return res.status(400).json({ error: 'Parâmetro "title" é obrigatório' });
  }

  try {
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${searchQuery}`);
    const movie = response.data;

    if (movie.Response === 'True') {
      return res.json({ title: movie.Title });
    } else {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao buscar filme:', error);
    return res.status(500).json({ error: 'Erro ao buscar filme' });
  }
});

app.listen(PORT, () => {
  console.log(`Gateway rodando na porta ${PORT}`);
  console.log(`Acesse a documentação Swagger em http://localhost:${PORT}/api-docs`);
});
