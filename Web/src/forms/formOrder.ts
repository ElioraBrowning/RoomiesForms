export const INTERNSHIP_PACKET_ORDER: Record<string, number> = {
  CS401: 1,
  CS402: 2,
  CS403: 3,
  CS404: 4,
  CS420: 5,
  CS410: 6,
  CS405: 7,
  ExitSurvey: 99,
};

export function compareFormKeys(aKey: string, bKey: string): number {
  const normA = aKey.replace(/\s+/g, '').toUpperCase();
  const normB = bKey.replace(/\s+/g, '').toUpperCase();

  const orderA =
    Object.entries(INTERNSHIP_PACKET_ORDER).find(
      ([k]) => k.toUpperCase() === normA
    )?.[1] ?? 50;
  const orderB =
    Object.entries(INTERNSHIP_PACKET_ORDER).find(
      ([k]) => k.toUpperCase() === normB
    )?.[1] ?? 50;

  if (orderA !== orderB) return orderA - orderB;
  return aKey.localeCompare(bKey);
}