module.exports = (sequelize, DataTypes) => {
  const CannedResponse = sequelize.define(
    "CannedResponse",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      created_by: { type: DataTypes.UUID, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      category_id: { type: DataTypes.UUID, allowNull: true }
    },
    { tableName: "canned_responses", underscored: true, updatedAt: false }
  );

  return CannedResponse;
};
