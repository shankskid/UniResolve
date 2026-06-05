module.exports = (sequelize, DataTypes) => {
  const Hall = sequelize.define(
    "Hall",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      hall_number: { type: DataTypes.INTEGER, allowNull: false }
    },
    { tableName: "halls", underscored: true }
  );

  Hall.associate = (models) => {
    Hall.hasMany(models.User, { foreignKey: "hall_id" });
  };

  return Hall;
};
