module.exports = (sequelize, DataTypes) => {
  const OfficerAssignment = sequelize.define(
    "OfficerAssignment",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      officer_id: { type: DataTypes.UUID, allowNull: false },
      scope_type: { type: DataTypes.ENUM("hall", "department"), allowNull: false },
      scope_id: { type: DataTypes.UUID, allowNull: false }
    },
    { tableName: "officer_assignments", underscored: true }
  );

  OfficerAssignment.associate = (models) => {
    OfficerAssignment.belongsTo(models.User, { foreignKey: "officer_id", as: "officer" });
  };

  return OfficerAssignment;
};
