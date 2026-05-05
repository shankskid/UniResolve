module.exports = (sequelize, DataTypes) => {
  const HallZone = sequelize.define(
    "HallZone",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      campus_id: { type: DataTypes.UUID, allowNull: false },
      grievance_officer_id: { type: DataTypes.UUID, allowNull: true }
    },
    { tableName: "hall_zones", underscored: true }
  );

  HallZone.associate = (models) => {
    HallZone.belongsTo(models.Campus, { foreignKey: "campus_id" });
    HallZone.belongsTo(models.User, { foreignKey: "grievance_officer_id", as: "grievanceOfficer" });
    HallZone.hasMany(models.Hall, { foreignKey: "hall_zone_id" });
  };

  return HallZone;
};
