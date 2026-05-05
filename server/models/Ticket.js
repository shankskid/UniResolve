const { JURISDICTION_VALUES, TICKET_STATUS_VALUES, URGENCY_VALUES } = require("@uniresolve/shared");

module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define(
    "Ticket",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      title: { type: DataTypes.STRING(300), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM(...TICKET_STATUS_VALUES), allowNull: false, defaultValue: "open" },
      urgency: { type: DataTypes.ENUM(...URGENCY_VALUES), allowNull: false },
      category_id: { type: DataTypes.UUID, allowNull: false },
      submitter_id: { type: DataTypes.UUID, allowNull: false },
      assigned_to: { type: DataTypes.UUID, allowNull: true },
      campus_id: { type: DataTypes.UUID, allowNull: false },
      jurisdiction_type: { type: DataTypes.ENUM(...JURISDICTION_VALUES), allowNull: false },
      is_anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sla_deadline: { type: DataTypes.DATE, allowNull: true },
      sla_breached: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true }
    },
    { tableName: "tickets", underscored: true, paranoid: true, deletedAt: "deleted_at" }
  );

  Ticket.associate = (models) => {
    Ticket.belongsTo(models.Category, { foreignKey: "category_id" });
    Ticket.belongsTo(models.User, { foreignKey: "submitter_id", as: "submitter" });
    Ticket.belongsTo(models.User, { foreignKey: "assigned_to", as: "assignee" });
    Ticket.belongsTo(models.Campus, { foreignKey: "campus_id" });
  };

  return Ticket;
};
