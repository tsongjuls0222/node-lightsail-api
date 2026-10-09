module.exports = {
  apps: [
    {
      name: 'node-lightsail-api',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1, // in-memory store, see src/store/taskStore.js
      exec_mode: 'fork',
      max_memory_restart: '300M',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
