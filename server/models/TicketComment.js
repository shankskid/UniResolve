module.exports = (sequelize, DataTypes) => {
  const TicketComment = sequelize.define(
    "TicketComment",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ticket_id: { type: DataTypes.UUID, allowNull: false },
      author_id: { type: DataTypes.UUID, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      is_internal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    { tableName: "ticket_comments", underscored: true, updatedAt: false }
  );

  TicketComment.associate = (models) => {
    TicketComment.belongsTo(models.User, { foreignKey: "author_id", as: "author" });
  };

  return TicketComment;
};
