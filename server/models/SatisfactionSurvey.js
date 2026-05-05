module.exports = (sequelize, DataTypes) => {
  const SatisfactionSurvey = sequelize.define(
    "SatisfactionSurvey",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ticket_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      submitter_id: { type: DataTypes.UUID, allowNull: false },
      resolved_satisfactorily: { type: DataTypes.BOOLEAN, allowNull: false },
      response_time_score: { type: DataTypes.INTEGER, allowNull: false },
      comments: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: "satisfaction_surveys", underscored: true, updatedAt: false }
  );

  return SatisfactionSurvey;
};
