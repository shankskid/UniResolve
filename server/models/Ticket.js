module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define(
    "Ticket",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      title: { type: DataTypes.STRING(300), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM("open", "in_progress", "resolved", "closed"), allowNull: false, defaultValue: "open" },
      urgency: { type: DataTypes.ENUM("low", "medium", "high", "urgent"), allowNull: false },
      category_id: { type: DataTypes.UUID, allowNull: false },
      submitter_id: { type: DataTypes.UUID, allowNull: false },
      assigned_to: { type: DataTypes.UUID, allowNull: true },
      jurisdiction_type: { type: DataTypes.ENUM("hall", "department"), allowNull: false },
      scope_type: { type: DataTypes.ENUM("hall", "department"), allowNull: true },
      scope_id: { type: DataTypes.UUID, allowNull: true },
      is_anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sla_deadline: { type: DataTypes.DATE, allowNull: true },
      sla_breached: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true }
    },
    { tableName: "tickets", underscored: true }
  );

  Ticket.associate = (models) => {
    Ticket.belongsTo(models.Category, { foreignKey: "category_id" });
    Ticket.belongsTo(models.User, { foreignKey: "submitter_id", as: "submitter" });
    Ticket.belongsTo(models.User, { foreignKey: "assigned_to", as: "assignee" });
    Ticket.hasMany(models.TicketComment, { foreignKey: "ticket_id" });
    Ticket.hasMany(models.TicketHistory, { foreignKey: "ticket_id" });
  };

  return Ticket;
};
