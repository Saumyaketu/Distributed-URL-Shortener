import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { registerUser } from "../services/auth.service";
import { useAuth } from "../contexts/AuthContext";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
};

const RegisterPage = () => {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-black" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      setServerError("");
      const result = await registerUser(data.name, data.email, data.password);
      setUser(result.data.user);
      navigate("/");
    } catch (error: any) {
      console.error(error);
      setServerError(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md p-6 border rounded-lg space-y-4"
      >
        <h1 className="text-2xl font-bold">Register</h1>

        {serverError && (
          <div className="text-red-500 bg-red-50 p-3 rounded-md text-sm border border-red-200">
            {serverError}
          </div>
        )}

        <div>
          <input
            placeholder="Name"
            className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${
              errors.name
                ? "border-red-500 focus:ring-red-200"
                : "focus:ring-blue-200"
            }`}
            {...register("name", {
              required: "Name is required",
            })}
          />
          {errors.name && (
            <span className="text-red-500 text-xs mt-1 block">
              {errors.name.message}
            </span>
          )}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${
              errors.email
                ? "border-red-500 focus:ring-red-200"
                : "focus:ring-blue-200"
            }`}
            {...register("email", {
              required: "Email is required",
            })}
          />
          {errors.email && (
            <span className="text-red-500 text-xs mt-1 block">
              {errors.email.message}
            </span>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${
              errors.password
                ? "border-red-500 focus:ring-red-200"
                : "focus:ring-blue-200"
            }`}
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
          />
          {errors.password && (
            <span className="text-red-500 text-xs mt-1 block">
              {errors.password.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border p-2 rounded bg-black text-white font-medium disabled:opacity-50 transition-opacity flex justify-center items-center"
        >
          {isSubmitting ? "Registering..." : "Register"}
        </button>

        <p>
          Already have an account?{" "}
          <Link to="/login" className="underline font-medium text-blue-600">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;
