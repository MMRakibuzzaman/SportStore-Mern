import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";
import { loginSchema, type LoginPayload } from "../validation/auth.validation.js";

export function Login() {
  const navigate = useNavigate();
  const loginUser = useAppStore((state) => state.loginUser);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (values: LoginPayload): Promise<void> => {
    try {
      setSubmissionError(null);
      setIsSubmittingForm(true);

      await loginUser(values);
      navigate("/", { replace: true });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Failed to login.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Welcome Back</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Sign in to SportStore</h1>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Email</span>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            placeholder="you@example.com"
          />
          {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Password</span>
          <input
            type="password"
            {...register("password")}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            placeholder="Enter your password"
          />
          {errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}
        </label>

        {submissionError ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {submissionError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmittingForm}
          className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmittingForm ? "Signing in..." : "Login"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-300">
        New here?{" "}
        <Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}
