module.exports = (sequelize, DataTypes) => {
  const ResolutionChecklist = sequelize.define(
    "ResolutionChecklist",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      category_id: { type: DataTypes.UUID, allowNull: false },
      step_order: { type: DataTypes.INTEGER, allowNull: false },
      step_text: { type: DataTypes.STRING(300), allowNull: false }
    },
    { tableName: "resolution_checklists", underscored: true, updatedAt: false }
  );

  return ResolutionChecklist;
};
