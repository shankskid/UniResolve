require("dotenv").config();

const common = {
  dialect: "postgres",
  dialectOptions: process.env.NODE_ENV === "production" ? { ssl: { require: true, rejectUnauthorized: false } } : {}
};

module.exports = {
  development: {
    use_env_variable: "DATABASE_URL",
    ...common
  },
  test: {
    use_env_variable: "DATABASE_TEST_URL",
    url: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL,
    ...common
  },
  production: {
    use_env_variable: "DATABASE_URL",
    ...common
  }
};
