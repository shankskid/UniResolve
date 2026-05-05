const { JURISDICTION_VALUES, URGENCY_VALUES } = require("@uniresolve/shared");

module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      jurisdiction_type: { type: DataTypes.ENUM(...JURISDICTION_VALUES), allowNull: false },
      min_urgency: { type: DataTypes.ENUM(...URGENCY_VALUES), allowNull: true }
    },
    { tableName: "categories", underscored: true }
  );

  Category.associate = (models) => {
    Category.hasMany(models.Ticket, { foreignKey: "category_id" });
  };

  return Category;
};
