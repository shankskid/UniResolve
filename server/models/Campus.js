module.exports = (sequelize, DataTypes) => {
  const Campus = sequelize.define(
    "Campus",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      location: { type: DataTypes.STRING(200), allowNull: true }
    },
    { tableName: "campuses", underscored: true }
  );

  Campus.associate = (models) => {
    Campus.hasMany(models.Faculty, { foreignKey: "campus_id" });
    Campus.hasMany(models.Department, { foreignKey: "campus_id" });
    Campus.hasMany(models.Hall, { foreignKey: "campus_id" });
    Campus.hasMany(models.HallZone, { foreignKey: "campus_id" });
    Campus.hasMany(models.User, { foreignKey: "campus_id" });
  };

  return Campus;
};
