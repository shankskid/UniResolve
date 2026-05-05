module.exports = (sequelize, DataTypes) => {
  const Hall = sequelize.define(
    "Hall",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      hall_number: { type: DataTypes.INTEGER, allowNull: false },
      campus_id: { type: DataTypes.UUID, allowNull: false },
      hall_zone_id: { type: DataTypes.UUID, allowNull: false }
    },
    { tableName: "halls", underscored: true }
  );

  Hall.associate = (models) => {
    Hall.belongsTo(models.Campus, { foreignKey: "campus_id" });
    Hall.belongsTo(models.HallZone, { foreignKey: "hall_zone_id" });
    Hall.hasMany(models.User, { foreignKey: "hall_id" });
  };

  return Hall;
};
