import { useCallback, useEffect, useState } from "react";
import { listTickets } from "../services/tickets";

export default function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listTickets();
      setTickets(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tickets, loading, refresh };
}
