
import { useEffect, useState } from "react";

const INVENTORY_KEY = "inventory_sent_payloads";

export default function useInventoryData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(INVENTORY_KEY);
      if (stored) {
        let arr = JSON.parse(stored);
        // If array items have a payload property, keep the full object (needed for date filtering)
        setData(arr);
      } else {
        setData([]);
      }
      setError(null);
    } catch (err) {
      setError("Failed to load inventory from localStorage");
      setData([]);
    }
    setLoading(false);
  }, []);

  return { data, loading, error };
}
