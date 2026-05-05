module.exports = (sequelize, DataTypes) => {
  const TicketChecklistItem = sequelize.define(
    "TicketChecklistItem",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ticket_id: { type: DataTypes.UUID, allowNull: false },
      checklist_id: { type: DataTypes.UUID, allowNull: false },
      is_completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      completed_by: { type: DataTypes.UUID, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true }
    },
    { tableName: "ticket_checklist_items", underscored: true, updatedAt: false }
  );

  return TicketChecklistItem;
};
