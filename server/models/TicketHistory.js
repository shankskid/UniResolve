module.exports = (sequelize, DataTypes) => {
  const TicketHistory = sequelize.define(
    "TicketHistory",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ticket_id: { type: DataTypes.UUID, allowNull: false },
      changed_by: { type: DataTypes.STRING(100), allowNull: false },
      field_changed: { type: DataTypes.STRING(100), allowNull: false },
      old_value: { type: DataTypes.TEXT, allowNull: true },
      new_value: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: "ticket_history", underscored: true, updatedAt: false }
  );

  TicketHistory.associate = (models) => {
    TicketHistory.belongsTo(models.Ticket, { foreignKey: "ticket_id" });
  };

  return TicketHistory;
};
