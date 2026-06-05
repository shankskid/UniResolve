const { ROLE_VALUES } = require("@uniresolve/shared");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(200), allowNull: false },
      email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      role: { type: DataTypes.ENUM(...ROLE_VALUES), allowNull: false },
      user_type: { type: DataTypes.ENUM("student", "staff"), allowNull: true },
      registration_number: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      department_id: { type: DataTypes.UUID, allowNull: true },
      hall_id: { type: DataTypes.UUID, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_timed_out: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status_reason: { type: DataTypes.TEXT, allowNull: true },
      timeout_until: { type: DataTypes.DATE, allowNull: true }
    },
    { tableName: "users", underscored: true }
  );

  User.associate = (models) => {
    User.belongsTo(models.Department, { foreignKey: "department_id" });
    User.belongsTo(models.Hall, { foreignKey: "hall_id" });
    User.hasMany(models.PasswordResetToken, { foreignKey: "user_id" });
  };

  return User;
};
