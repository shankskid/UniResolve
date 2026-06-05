import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getDepartments, getHalls } from "../services/reference";
import {
  createOfficerAssignment,
  createOverseerAssignment,
  deleteOfficerAssignment,
  deleteOverseerAssignment,
  listManagedUsers,
  listOfficerAssignments,
  listOverseerAssignments
} from "../services/tickets";

export default function AdminAssignmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState([]);
  const [overseers, setOverseers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [halls, setHalls] = useState([]);
  const [officerAssignments, setOfficerAssignments] = useState([]);
  const [overseerAssignments, setOverseerAssignments] = useState([]);
  const [scopeType, setScopeType] = useState("hall");
  const [scopeId, setScopeId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [overseerId, setOverseerId] = useState("");
  const [supervisedOfficerId, setSupervisedOfficerId] = useState("");
  const [assigningOfficer, setAssigningOfficer] = useState(false);
  const [assigningOverseer, setAssigningOverseer] = useState(false);

  const scopeItems = scopeType === "hall" ? halls : departments;

  const hallMap = useMemo(() => new Map(halls.map((hall) => [hall.id, hall.name])), [halls]);
  const deptMap = useMemo(() => new Map(departments.map((dept) => [dept.id, dept.name])), [departments]);

  useEffect(() => {
    async function loadData() {
      if (user?.role !== "superadmin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [users, officerRows, overseerRows, deptRows, hallRows] = await Promise.all([
          listManagedUsers(),
          listOfficerAssignments(),
          listOverseerAssignments(),
          getDepartments(),
          getHalls()
        ]);
        setOfficers(users.filter((entry) => entry.role === "officer" && entry.is_active));
        setOverseers(users.filter((entry) => entry.role === "overseer" && entry.is_active));
        setOfficerAssignments(officerRows);
        setOverseerAssignments(overseerRows);
        setDepartments(deptRows);
        setHalls(hallRows);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load assignments.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.role]);

  useEffect(() => {
    if (!scopeItems.length) {
      setScopeId("");
      return;
    }
    setScopeId((prev) => (scopeItems.some((item) => item.id === prev) ? prev : scopeItems[0].id));
  }, [scopeItems]);

  useEffect(() => {
    if (!officers.length) {
      setOfficerId("");
      setSupervisedOfficerId("");
      return;
    }
    setOfficerId((prev) => (officers.some((item) => item.id === prev) ? prev : officers[0].id));
    setSupervisedOfficerId((prev) => (officers.some((item) => item.id === prev) ? prev : officers[0].id));
  }, [officers]);

  useEffect(() => {
    if (!overseers.length) {
      setOverseerId("");
      return;
    }
    setOverseerId((prev) => (overseers.some((item) => item.id === prev) ? prev : overseers[0].id));
  }, [overseers]);

  async function refreshAssignments() {
    const [officerRows, overseerRows] = await Promise.all([listOfficerAssignments(), listOverseerAssignments()]);
    setOfficerAssignments(officerRows);
    setOverseerAssignments(overseerRows);
  }

  async function handleOfficerAssignment(event) {
    event.preventDefault();
    if (!scopeId || !officerId) {
      toast.error("Select a scope and officer.");
      return;
    }
    setAssigningOfficer(true);
    try {
      await createOfficerAssignment({ scope_type: scopeType, scope_id: scopeId, officer_id: officerId });
      toast.success("Officer assignment saved.");
      await refreshAssignments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save officer assignment.");
    } finally {
      setAssigningOfficer(false);
    }
  }

  async function handleOverseerAssignment(event) {
    event.preventDefault();
    if (!overseerId || !supervisedOfficerId) {
      toast.error("Select an overseer and officer.");
      return;
    }
    setAssigningOverseer(true);
    try {
      await createOverseerAssignment({ overseer_id: overseerId, officer_id: supervisedOfficerId });
      toast.success("Overseer assignment saved.");
      await refreshAssignments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save overseer assignment.");
    } finally {
      setAssigningOverseer(false);
    }
  }

  async function handleDeleteOfficerAssignment(id) {
    if (!window.confirm("Remove this officer assignment?")) return;
    try {
      await deleteOfficerAssignment(id);
      setOfficerAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Officer assignment removed.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove assignment.");
    }
  }

  async function handleDeleteOverseerAssignment(id) {
    if (!window.confirm("Remove this overseer assignment?")) return;
    try {
      await deleteOverseerAssignment(id);
      setOverseerAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Overseer assignment removed.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove assignment.");
    }
  }

  function resolveScopeName(assignment) {
    if (assignment.scope_type === "hall") {
      return hallMap.get(assignment.scope_id) || assignment.scope_id;
    }
    if (assignment.scope_type === "department") {
      return deptMap.get(assignment.scope_id) || assignment.scope_id;
    }
    return assignment.scope_id;
  }

  if (user?.role !== "superadmin") {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Assignment management</h2>
        <p className="muted">Only superadmin can manage assignments.</p>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Assignment management</h2>
        <p className="muted" style={{ margin: 0 }}>
          Maintain officer and overseer coverage for every hall and department.
        </p>
      </div>

      {loading && <div className="card">Loading assignments...</div>}

      {!loading && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Assign officer to scope</h3>
            <form className="form" onSubmit={handleOfficerAssignment}>
              <div className="grid grid-2">
                <div>
                  <label className="label" htmlFor="scope-type">
                    Scope type
                  </label>
                  <select
                    id="scope-type"
                    className="select"
                    value={scopeType}
                    onChange={(event) => setScopeType(event.target.value)}
                  >
                    <option value="hall">Hall</option>
                    <option value="department">Department</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="scope-id">
                    Scope
                  </label>
                  <select
                    id="scope-id"
                    className="select"
                    value={scopeId}
                    onChange={(event) => setScopeId(event.target.value)}
                    disabled={!scopeItems.length}
                  >
                    {scopeItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="officer-id">
                  Officer
                </label>
                <select
                  id="officer-id"
                  className="select"
                  value={officerId}
                  onChange={(event) => setOfficerId(event.target.value)}
                  disabled={!officers.length}
                >
                  {officers.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.email})
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={assigningOfficer || !scopeId || !officerId}>
                {assigningOfficer ? "Saving..." : "Save assignment"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Assign overseer to officer</h3>
            <form className="form" onSubmit={handleOverseerAssignment}>
              <div className="grid grid-2">
                <div>
                  <label className="label" htmlFor="overseer-id">
                    Overseer
                  </label>
                  <select
                    id="overseer-id"
                    className="select"
                    value={overseerId}
                    onChange={(event) => setOverseerId(event.target.value)}
                    disabled={!overseers.length}
                  >
                    {overseers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="supervised-officer-id">
                    Officer
                  </label>
                  <select
                    id="supervised-officer-id"
                    className="select"
                    value={supervisedOfficerId}
                    onChange={(event) => setSupervisedOfficerId(event.target.value)}
                    disabled={!officers.length}
                  >
                    {officers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={assigningOverseer || !overseerId || !supervisedOfficerId}>
                {assigningOverseer ? "Saving..." : "Save assignment"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Officer assignments</h3>
            {!officerAssignments.length && <p className="muted">No officer assignments configured.</p>}
            {!!officerAssignments.length && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Scope</th>
                      <th>Officer</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {officerAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          {assignment.scope_type}: {resolveScopeName(assignment)}
                        </td>
                        <td>
                          {assignment.officer?.name} ({assignment.officer?.email})
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteOfficerAssignment(assignment.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Overseer assignments</h3>
            {!overseerAssignments.length && <p className="muted">No overseer assignments configured.</p>}
            {!!overseerAssignments.length && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Overseer</th>
                      <th>Officer</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overseerAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          {assignment.overseer?.name} ({assignment.overseer?.email})
                        </td>
                        <td>
                          {assignment.officer?.name} ({assignment.officer?.email})
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteOverseerAssignment(assignment.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
