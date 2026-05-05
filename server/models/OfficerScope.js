module.exports = (sequelize, DataTypes) => {
  const OfficerScope = sequelize.define(
    "OfficerScope",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      scope_type: { type: DataTypes.ENUM("hall_zone", "department", "faculty", "campus", "university"), allowNull: false },
      scope_id: { type: DataTypes.UUID, allowNull: true }
    },
    { tableName: "officer_scopes", underscored: true }
  );

  OfficerScope.associate = (models) => {
    OfficerScope.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return OfficerScope;
};
