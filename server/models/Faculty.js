module.exports = (sequelize, DataTypes) => {
  const Faculty = sequelize.define(
    "Faculty",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      campus_id: { type: DataTypes.UUID, allowNull: false }
    },
    { tableName: "faculties", underscored: true }
  );

  Faculty.associate = (models) => {
    Faculty.belongsTo(models.Campus, { foreignKey: "campus_id" });
    Faculty.hasMany(models.Department, { foreignKey: "faculty_id" });
  };

  return Faculty;
};
