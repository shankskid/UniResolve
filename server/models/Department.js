module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false }
    },
    { tableName: "departments", underscored: true }
  );

  Department.associate = (models) => {
    Department.hasMany(models.User, { foreignKey: "department_id" });
  };

  return Department;
};
