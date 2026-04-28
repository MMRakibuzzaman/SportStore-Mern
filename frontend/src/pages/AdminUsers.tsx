import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";

type UserRole = "customer" | "admin";

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  data: AdminUser[];
}

interface UpdateUserRoleResponse {
  success: boolean;
  data: AdminUser;
}

interface ToastState {
  id: number;
  message: string;
}

export function AdminUsers() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingUserIds, setUpdatingUserIds] = useState<
    Record<string, boolean>
  >({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const roleFilterRaw = searchParams.get("role")?.trim().toLowerCase() ?? "all";
  const roleFilter: "all" | "admin" | "customer" =
    roleFilterRaw === "admin" || roleFilterRaw === "customer"
      ? roleFilterRaw
      : "all";

  useEffect(() => {
    const controller = new AbortController();

    const loadUsers = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await api.get<UsersResponse>("/users", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setUsers(response.data.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load users.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast((currentToast) =>
        currentToast?.id === toast.id ? null : currentToast,
      );
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  const userCounts = useMemo(() => {
    const admins = users.filter((user) => user.role === "admin").length;
    const customers = users.length - admins;

    return {
      admins,
      customers,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") {
      return users;
    }

    return users.filter((user) => user.role === roleFilter);
  }, [users, roleFilter]);

  const showSuccessToast = (message: string): void => {
    setToast((currentToast) => ({
      id: (currentToast?.id ?? 0) + 1,
      message,
    }));
  };

  const formatJoinDate = (dateText: string): string => {
    const date = new Date(dateText);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  };

  const handleRoleChange = async (
    userId: string,
    nextRole: UserRole,
  ): Promise<void> => {
    const currentUser = users.find((user) => user.id === userId);

    if (!currentUser || currentUser.role === nextRole) {
      return;
    }

    const previousRole = currentUser.role;

    setUpdatingUserIds((current) => ({
      ...current,
      [userId]: true,
    }));

    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              role: nextRole,
            }
          : user,
      ),
    );

    try {
      const response = await api.patch<UpdateUserRoleResponse>(
        `/users/${userId}/role`,
        {
          role: nextRole,
        },
      );

      setUsers((current) =>
        current.map((user) => (user.id === userId ? response.data.data : user)),
      );

      showSuccessToast(`Role updated for ${response.data.data.email}.`);
    } catch (error) {
      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: previousRole,
              }
            : user,
        ),
      );

      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update user role.",
      );
    } finally {
      setUpdatingUserIds((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Users
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Role Management
          </h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Manage customer and admin permissions with immediate role updates.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Admins
            </p>
            <p className="mt-1 text-xl font-semibold text-cyan-300">
              {userCounts.admins}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Customers
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-300">
              {userCounts.customers}
            </p>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/35">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Current Role</th>
                <th className="px-4 py-3 font-medium">Join Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-slate-200">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={3}>
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={3}>
                    No users found for the selected role.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isUpdating = updatingUserIds[user.id] === true;

                  return (
                    <tr
                      key={user.id}
                      className="bg-slate-900/20 hover:bg-white/5"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {user.email}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={user.role}
                          onChange={(event) => {
                            const nextRole = event.target.value as UserRole;
                            void handleRoleChange(user.id, nextRole);
                          }}
                          disabled={isUpdating}
                          className={`rounded-lg border bg-slate-900 px-3 py-2 text-sm outline-none transition ${
                            user.role === "admin"
                              ? "border-cyan-400/40 text-cyan-200"
                              : "border-emerald-400/40 text-emerald-200"
                          } ${
                            isUpdating
                              ? "cursor-not-allowed opacity-70"
                              : "focus:ring-2 focus:ring-cyan-400/30"
                          }`}
                        >
                          <option value="customer">customer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {formatJoinDate(user.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100 shadow-xl shadow-black/30 backdrop-blur-sm">
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
