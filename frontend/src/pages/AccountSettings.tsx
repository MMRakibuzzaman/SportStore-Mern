import { useEffect, useState, type FormEvent } from "react";
import { fetchCurrentProfile, updateCurrentProfile } from "../services/account.js";
import { emptyShippingForm, type ShippingFormState } from "../services/checkoutStorage.js";
import { useAppStore } from "../store/useAppStore.js";

type ShippingFormErrors = Partial<Record<keyof ShippingFormState, string>>;

interface CredentialFormState {
  currentPassword: string;
  email: string;
  newPassword: string;
}

type CredentialErrors = Partial<Record<keyof CredentialFormState, string>>;

export function AccountSettings() {
  const authUser = useAppStore((state) => state.auth.user);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const [shippingForm, setShippingForm] = useState<ShippingFormState>({ ...emptyShippingForm });
  const [credentials, setCredentials] = useState<CredentialFormState>({
    currentPassword: "",
    email: "",
    newPassword: "",
  });
  const [shippingErrors, setShippingErrors] = useState<ShippingFormErrors>({});
  const [credentialErrors, setCredentialErrors] = useState<CredentialErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (): Promise<void> => {
      try {
        const profile = await fetchCurrentProfile();

        if (!isMounted) {
          return;
        }

        setShippingForm(profile.savedShippingAddress ?? { ...emptyShippingForm, email: profile.email });
        setCredentials((current) => ({
          ...current,
          email: profile.email,
        }));
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load account profile right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateShippingField = (field: keyof ShippingFormState, value: string): void => {
    setShippingForm((current) => ({
      ...current,
      [field]: value,
    }));

    setShippingErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateCredentialField = (field: keyof CredentialFormState, value: string): void => {
    setCredentials((current) => ({
      ...current,
      [field]: value,
    }));

    setCredentialErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateShipping = (): ShippingFormErrors => {
    const errors: ShippingFormErrors = {};

    if (!shippingForm.email.trim()) errors.email = "Email is required.";
    if (!shippingForm.streetLine1.trim()) errors.streetLine1 = "Street address is required.";
    if (!shippingForm.city.trim()) errors.city = "City is required.";
    if (!shippingForm.state.trim()) errors.state = "State / Province is required.";
    if (!shippingForm.postalCode.trim()) errors.postalCode = "Postal code is required.";
    if (!shippingForm.country.trim()) errors.country = "Country is required.";

    return errors;
  };

  const validateCredentials = (): CredentialErrors => {
    const errors: CredentialErrors = {};
    const wantsEmailChange = credentials.email.trim() && credentials.email.trim() !== authUser?.email;
    const wantsPasswordChange = credentials.newPassword.trim().length > 0;

    if (!wantsEmailChange && !wantsPasswordChange) {
      errors.email = "Enter an email or password to update your account.";
      return errors;
    }

    if (wantsEmailChange && !/^\S+@\S+\.\S+$/.test(credentials.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (wantsPasswordChange && credentials.newPassword.trim().length < 8) {
      errors.newPassword = "Password must be at least 8 characters long.";
    }

    if (!credentials.currentPassword.trim()) {
      errors.currentPassword = "Current password is required.";
    }

    return errors;
  };

  const handleSaveAddress = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const errors = validateShipping();

    if (Object.keys(errors).length > 0) {
      setShippingErrors(errors);
      return;
    }

    try {
      setIsSavingAddress(true);
      const updatedProfile = await updateCurrentProfile({ savedShippingAddress: shippingForm });
      setShippingForm(updatedProfile.savedShippingAddress ?? shippingForm);
      setSuccessMessage("Saved address updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSaveCredentials = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const errors = validateCredentials();

    if (Object.keys(errors).length > 0) {
      setCredentialErrors(errors);
      return;
    }

    try {
      setIsSavingCredentials(true);
      const updatedProfile = await updateCurrentProfile({
        email: credentials.email.trim() || undefined,
        currentPassword: credentials.currentPassword,
        newPassword: credentials.newPassword.trim() || undefined,
      });

      setAuthUser({
        email: updatedProfile.email,
        role: updatedProfile.role,
      });

      setCredentials({
        currentPassword: "",
        email: updatedProfile.email,
        newPassword: "",
      });
      setSuccessMessage("Account credentials updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update credentials.");
    } finally {
      setIsSavingCredentials(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-slate-300">
        Loading account settings...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Account</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Update your login details and the address we keep on file for checkout.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSaveCredentials} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
          <div className="border-b border-white/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Login Details
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Email and Password</h2>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={credentials.email}
                onChange={(event) => {
                  updateCredentialField("email", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${credentialErrors.email
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {credentialErrors.email ? (
                <p className="text-xs text-red-300">{credentialErrors.email}</p>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Current Password</span>
              <input
                type="password"
                value={credentials.currentPassword}
                onChange={(event) => {
                  updateCredentialField("currentPassword", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${credentialErrors.currentPassword
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {credentialErrors.currentPassword ? (
                <p className="text-xs text-red-300">{credentialErrors.currentPassword}</p>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">New Password</span>
              <input
                type="password"
                value={credentials.newPassword}
                onChange={(event) => {
                  updateCredentialField("newPassword", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${credentialErrors.newPassword
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {credentialErrors.newPassword ? (
                <p className="text-xs text-red-300">{credentialErrors.newPassword}</p>
              ) : null}
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSavingCredentials}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSavingCredentials ? "Saving..." : "Save Login Details"}
            </button>
          </div>
        </form>

        <form onSubmit={handleSaveAddress} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
          <div className="border-b border-white/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Permanent Address
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Saved Checkout Address</h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={shippingForm.email}
                onChange={(event) => {
                  updateShippingField("email", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${shippingErrors.email
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {shippingErrors.email ? <p className="text-xs text-red-300">{shippingErrors.email}</p> : null}
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Street Address</span>
              <input
                type="text"
                value={shippingForm.streetLine1}
                onChange={(event) => {
                  updateShippingField("streetLine1", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${shippingErrors.streetLine1
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {shippingErrors.streetLine1 ? (
                <p className="text-xs text-red-300">{shippingErrors.streetLine1}</p>
              ) : null}
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Apartment, suite, etc.</span>
              <input
                type="text"
                value={shippingForm.streetLine2}
                onChange={(event) => {
                  updateShippingField("streetLine2", event.target.value);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="Optional"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">City</span>
              <input
                type="text"
                value={shippingForm.city}
                onChange={(event) => {
                  updateShippingField("city", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${shippingErrors.city
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {shippingErrors.city ? <p className="text-xs text-red-300">{shippingErrors.city}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">State / Province</span>
              <input
                type="text"
                value={shippingForm.state}
                onChange={(event) => {
                  updateShippingField("state", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${shippingErrors.state
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {shippingErrors.state ? <p className="text-xs text-red-300">{shippingErrors.state}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Postal Code</span>
              <input
                type="text"
                value={shippingForm.postalCode}
                onChange={(event) => {
                  updateShippingField("postalCode", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${shippingErrors.postalCode
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {shippingErrors.postalCode ? (
                <p className="text-xs text-red-300">{shippingErrors.postalCode}</p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Country</span>
              <input
                type="text"
                value={shippingForm.country}
                onChange={(event) => {
                  updateShippingField("country", event.target.value);
                }}
                className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${shippingErrors.country
                  ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                  : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  }`}
              />
              {shippingErrors.country ? <p className="text-xs text-red-300">{shippingErrors.country}</p> : null}
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSavingAddress}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSavingAddress ? "Saving..." : "Save Address"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            This address can be reused during checkout and edited here later.
          </p>
        </form>
      </div>
    </section>
  );
}
