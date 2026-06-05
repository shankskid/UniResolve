import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { listManagedUsers } from "../services/tickets";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      if (user?.role !== "superadmin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const items = await listManagedUsers();
        setUsers(items);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [user?.role]);

  if (user?.role !== "superadmin") {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>User management</h2>
        <p className="muted">Only superadmin can manage users.</p>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>User management</h2>
        <p className="muted" style={{ margin: 0 }}>
          Review user accounts and roles.
        </p>
      </div>
      {loading && <div className="card">Loading users...</div>}
      {!loading && !users.length && <div className="card muted">No users found.</div>}
      {!loading && users.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.email}</td>
                    <td>{entry.role}</td>
                    <td>{entry.is_active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
