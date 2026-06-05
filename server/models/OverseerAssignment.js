module.exports = (sequelize, DataTypes) => {
  const OverseerAssignment = sequelize.define(
    "OverseerAssignment",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      overseer_id: { type: DataTypes.UUID, allowNull: false },
      officer_id: { type: DataTypes.UUID, allowNull: false }
    },
    { tableName: "overseer_assignments", underscored: true }
  );

  OverseerAssignment.associate = (models) => {
    OverseerAssignment.belongsTo(models.User, { foreignKey: "overseer_id", as: "overseer" });
    OverseerAssignment.belongsTo(models.User, { foreignKey: "officer_id", as: "officer" });
  };

  return OverseerAssignment;
};
