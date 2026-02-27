import React, { useEffect, useState } from "react";
import {
  permissionsList,
  loadRoles,
  saveRoles,
  type RoleConfig,
} from "../../services/rolesConfig";

const AdminSecurity: React.FC = () => {
  const [roles, setRoles] = useState<RoleConfig[]>(loadRoles());
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    setChanged(false);
  }, []);

  const togglePerm = (roleKey: string, perm: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.key !== roleKey) return r;
        if (r.permissions.includes("*")) return r; // superadmin immutable
        const has = r.permissions.includes(perm);
        const nextPerms = has
          ? r.permissions.filter((p) => p !== perm)
          : [...r.permissions, perm];
        return { ...r, permissions: nextPerms };
      }),
    );
    setChanged(true);
  };

  const addRole = () => {
    const label = newRoleLabel.trim();
    if (!label) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!key || roles.some((r) => r.key === key)) return;
    setRoles((prev) => [
      ...prev,
      { key, label, description: "Custom role", permissions: [] },
    ]);
    setNewRoleLabel("");
    setChanged(true);
  };

  const removeRole = (key: string) => {
    if (key === "super_admin") return;
    setRoles((prev) => prev.filter((r) => r.key !== key));
    setChanged(true);
  };

  const save = () => {
    saveRoles(roles);
    setChanged(false);
  };

  const reset = () => {
    const defaults = loadRoles(); // load will return defaults if storage absent
    saveRoles(defaults);
    setRoles(defaults);
    setChanged(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Admin Roles & Security</h1>
      <p className="text-gray-300">
        Configure role-based permissions. Changes persist in local storage for
        this demo.
      </p>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Add New Role
          </label>
          <input
            value={newRoleLabel}
            onChange={(e) => setNewRoleLabel(e.target.value)}
            placeholder="e.g., Support"
            className="w-full px-3 py-2 rounded bg-slate-700 text-white"
          />
        </div>
        <button
          onClick={addRole}
          className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
        >
          Add Role
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Role
              </th>
              {permissionsList.map((p) => (
                <th
                  key={p}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-300 capitalize"
                >
                  {p}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.key} className="border-t border-slate-700">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{role.label}</div>
                  <div className="text-xs text-gray-400">
                    {role.description}
                  </div>
                </td>
                {permissionsList.map((p) => (
                  <td key={p} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-sky-600"
                      checked={
                        role.permissions.includes("*") ||
                        role.permissions.includes(p)
                      }
                      onChange={() => togglePerm(role.key, p)}
                      disabled={role.permissions.includes("*")}
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  {role.key !== "super_admin" && (
                    <button
                      onClick={() => removeRole(role.key)}
                      className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-600 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={!changed}
          className={`px-4 py-2 rounded text-white ${changed ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-800 text-slate-400 cursor-not-allowed"}`}
        >
          Save Changes
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default AdminSecurity;
