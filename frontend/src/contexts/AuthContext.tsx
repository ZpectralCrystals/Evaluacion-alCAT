import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api } from "../lib/api";


type UserRole = "admin" | "juez";

type AuthSession = {
  token: string;
  username: string;
  role: UserRole;
  userId: number | null;
  canEditScores: boolean;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
  can_edit_scores: boolean;
};

type UserProfileResponse = {
  id: number;
  username: string;
  role: UserRole;
  can_edit_scores: boolean;
};

type AuthContextValue = {
  user: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthSession>;
  logout: () => void;
  setUser: (user: AuthSession | null) => void;
};


const AUTH_STORAGE_KEY = "juzgamiento.auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


function parseUserIdFromToken(token: string) {
  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) {
      return null;
    }

    const normalizedPayload = payloadSegment
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=");

    const payload = JSON.parse(window.atob(normalizedPayload)) as {
      user_id?: unknown;
    };

    return typeof payload.user_id === "number" ? payload.user_id : null;
  } catch {
    return null;
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession) as Partial<AuthSession>;
        const hydratedSession: AuthSession = {
          token: parsedSession.token ?? "",
          username: parsedSession.username ?? "",
          role: parsedSession.role === "admin" ? "admin" : "juez",
          userId:
            typeof parsedSession.userId === "number"
              ? parsedSession.userId
              : parseUserIdFromToken(parsedSession.token ?? ""),
          canEditScores: parsedSession.canEditScores === true,
        };
        if (!hydratedSession.token || !hydratedSession.username) {
          throw new Error("Sesi\u00f3n inv\u00e1lida");
        }
        setUser(hydratedSession);
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function refreshProfile() {
      if (!user?.token) return;

      try {
        const response = await api.get<UserProfileResponse>("/api/users/me", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        setUser((current) => {
          if (!current) return current;
          const nextSession = {
            ...current,
            username: response.data.username,
            role: response.data.role,
            canEditScores: response.data.can_edit_scores,
          };
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
          return nextSession;
        });
      } catch {
        // Ignore background refresh errors and keep current session.
      }
    }

    void refreshProfile();
  }, [user?.token]);

  async function login(username: string, password: string) {
    const response = await api.post<LoginResponse>("/api/login", {
      username,
      password,
    });

    const session: AuthSession = {
      token: response.data.access_token,
      username: response.data.username,
      role: response.data.role,
      userId: parseUserIdFromToken(response.data.access_token),
      canEditScores: response.data.can_edit_scores,
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
