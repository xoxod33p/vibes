module.exports = {
  apps: [
    {
      name: "music-player",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 5000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
