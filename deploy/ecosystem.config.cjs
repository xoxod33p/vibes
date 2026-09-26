module.exports = {
  apps: [
    {
      name: "vibes",
      cwd: "/home/admin/vibes",
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
