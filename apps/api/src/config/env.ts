const portValue = Number(process.env.PORT ?? 3000);

export const env = {
  port: Number.isFinite(portValue) ? portValue : 3000,
};
