module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      ticket_id: { type: DataTypes.UUID, allowNull: true },
      type: { type: DataTypes.STRING(100), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    { tableName: "notifications", underscored: true, updatedAt: false }
  );

  return Notification;
};
