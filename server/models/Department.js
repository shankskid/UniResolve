module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      faculty_id: { type: DataTypes.UUID, allowNull: false },
      campus_id: { type: DataTypes.UUID, allowNull: false }
    },
    { tableName: "departments", underscored: true }
  );

  Department.associate = (models) => {
    Department.belongsTo(models.Faculty, { foreignKey: "faculty_id" });
    Department.belongsTo(models.Campus, { foreignKey: "campus_id" });
    Department.hasMany(models.User, { foreignKey: "department_id" });
  };

  return Department;
};
