require('dotenv').config({ quiet: true })

const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
    logging: false
})

const initDb = async () => {
    try {
        await sequelize.authenticate()
        console.log('Conexión a la base de datos establecida.')

        await sequelize.sync({ force: false })
        console.log('Modelos sincronizados.')
        
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error)
    }
}

module.exports = { sequelize, DataTypes, initDb }