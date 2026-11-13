import { defineRailway, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const apiUploads = volume("api-uploads", { region: "iad", sizeMB: 500 });
  const api = service("api", {
    build: "npm run test --workspace=api",
    preDeploy: "npm run db:migrate --workspace=api",
    start: "npm run start --workspace=api",
    healthcheck: "/health",
    healthcheckTimeout: 300,
    env: {
      NODE_ENV: "production",
      UPLOAD_ROOT: "/app/api/uploads",
      DATABASE_URL: preserve(),
      WEB_ORIGIN: preserve(),
    },
    volumeMounts: {
      "/app/api/uploads": apiUploads,
    },
  });

  const web = service("web", {
    build: "npm run build --workspace=web",
    start: "npm run start --workspace=web",
    healthcheck: "/health",
    healthcheckTimeout: 300,
    env: {
      NODE_ENV: "production",
      VITE_API_URL: preserve(),
    },
  });

  return project("oficina-john-filhos", {
    resources: [apiUploads, api, web],
  });
});
