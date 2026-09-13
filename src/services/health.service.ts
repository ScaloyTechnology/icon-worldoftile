export type ServiceHealth = Readonly<{
  service: "icon-world-of-tile";
  status: "ok";
}>;

export function getServiceHealth(): ServiceHealth {
  return {
    service: "icon-world-of-tile",
    status: "ok",
  };
}
