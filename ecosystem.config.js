module.exports = {
  apps: [
    {
      name: "vibes",
      script: "node_modules/.bin/next",
      args: "start -p 5000",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
