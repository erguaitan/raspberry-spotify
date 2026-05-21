const { sequelize, DataTypes } = require('./db')

const Song = sequelize.define('Song', {
  id: {
    type: DataTypes.STRING(22),
    allowNull: false,
    primaryKey: true,
    validate: {
      len: [1, 22]
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timeListened: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
},
{
  timestamps: false
})

module.exports = Song