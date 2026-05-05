module.exports = (sequelize, DataTypes) => {
  const TicketEscalation = sequelize.define(
    "TicketEscalation",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ticket_id: { type: DataTypes.UUID, allowNull: false },
      escalated_by: { type: DataTypes.UUID, allowNull: false },
      escalated_to_role: { type: DataTypes.STRING(100), allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: false }
    },
    { tableName: "ticket_escalations", underscored: true, updatedAt: false }
  );

  return TicketEscalation;
};
