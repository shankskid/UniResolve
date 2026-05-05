module.exports = (sequelize, DataTypes) => {
  const KnowledgeBase = sequelize.define(
    "KnowledgeBase",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      created_by: { type: DataTypes.UUID, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      category_id: { type: DataTypes.UUID, allowNull: true },
      source_ticket_id: { type: DataTypes.UUID, allowNull: true },
      is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    { tableName: "knowledge_base", underscored: true, updatedAt: false }
  );

  return KnowledgeBase;
};
