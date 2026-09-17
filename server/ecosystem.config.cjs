module.exports = {
  apps: [
    {
      name: "care-match-server",
      script: "index.js",
      cwd: "/home/ubuntu/care-match-ai/server",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
    },
  ],
};
