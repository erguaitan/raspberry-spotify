const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASSWORD, {
    host: config.DB_HOST,
    dialect: config.DB_DIALECT
});

// importar modelos
// ...

const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión a la base de datos establecida.');

        await sequelize.sync({ force: false });
        console.log('Modelos sincronizados.');
        
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
    }
};

module.exports = { sequelize, initDb };
