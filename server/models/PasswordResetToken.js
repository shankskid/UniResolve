module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define(
    "PasswordResetToken",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true }
    },
    { tableName: "password_reset_tokens", underscored: true, updatedAt: false }
  );

  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return PasswordResetToken;
};
