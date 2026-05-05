module.exports = (sequelize, DataTypes) => {
  const TicketAttachment = sequelize.define(
    "TicketAttachment",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ticket_id: { type: DataTypes.UUID, allowNull: false },
      uploader_id: { type: DataTypes.UUID, allowNull: false },
      file_url: { type: DataTypes.TEXT, allowNull: false },
      file_name: { type: DataTypes.STRING(255), allowNull: false },
      file_size: { type: DataTypes.BIGINT, allowNull: false }
    },
    { tableName: "ticket_attachments", underscored: true, updatedAt: false }
  );

  return TicketAttachment;
};
