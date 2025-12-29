// Normalizes inventory data to a flat array: [{ type, name, amount }]
export default function normalizeInventoryData(rawData) {
  if (!Array.isArray(rawData)) return [];
  if (rawData[0]?.items) {
    // Grouped format
    return rawData.flatMap(group =>
      group.items.map(item => ({
        ...item,
        type: group.type,
        amount: item.amount !== undefined ? item.amount : item.quantity
      }))
    );
  }
  // Flat format
  return rawData.map(item => ({
    ...item,
    amount: item.amount !== undefined ? item.amount : item.quantity
  }));
}
