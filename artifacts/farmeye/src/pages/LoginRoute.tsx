import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";

function safeNext(v: string | null): string {
  if (!v) return "/";
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
}

/**
 * /login route wrapper. If the user is already signed in, honor `?next=`
 * (used by the OAuth consent route) instead of hard-redirecting to `/`.
 */
export function LoginRoute() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  if (user) return <Navigate to={safeNext(params.get("next"))} replace />;
  return <LoginPage />;
}
