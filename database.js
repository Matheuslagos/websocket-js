// database.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:');

// Cria tabela para armazenar os filmes
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS movies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
});

const saveMovie = (name) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO movies (name) VALUES (?)', [name], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, name });
      }
    });
  });
};

const getMovies = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM movies', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = { saveMovie, getMovies };
