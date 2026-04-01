import type {
  AuthSessionResponse,
  SessionUser,
} from "@blog/shared";
import { API_ROUTES } from "@blog/shared";
import { defineStore } from "pinia";
import {
  apiFetch,
  clearStoredSessionToken,
  persistSessionToken,
} from "@/lib/api";

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  pending: boolean;
  error: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    ready: false,
    pending: false,
    error: null,
  }),
  actions: {
    async restoreSession() {
      if (this.ready) {
        return;
      }

      this.pending = true;
      this.error = null;

      try {
        const payload = await apiFetch<{ user: SessionUser }>(API_ROUTES.authMe);
        this.user = payload.user;
      } catch {
        clearStoredSessionToken();
        this.user = null;
      } finally {
        this.pending = false;
        this.ready = true;
      }
    },
    async register(input: {
      username: string;
      password: string;
      nickname: string;
      securityQuestion: string;
      securityAnswer: string;
    }) {
      this.pending = true;
      this.error = null;

      try {
        const payload = await apiFetch<AuthSessionResponse>(
          API_ROUTES.authRegister,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
          {
            omitAuth: true,
          },
        );

        persistSessionToken(payload.token);
        this.user = payload.user;
        this.ready = true;
        return payload.user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Registration failed";
        throw error;
      } finally {
        this.pending = false;
      }
    },
    async login(input: {
      username: string;
      password: string;
    }) {
      this.pending = true;
      this.error = null;

      try {
        const payload = await apiFetch<AuthSessionResponse>(
          API_ROUTES.authLogin,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
          {
            omitAuth: true,
          },
        );

        persistSessionToken(payload.token);
        this.user = payload.user;
        this.ready = true;
        return payload.user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Login failed";
        throw error;
      } finally {
        this.pending = false;
      }
    },
    async logout() {
      this.pending = true;
      this.error = null;

      try {
        await apiFetch<void>(API_ROUTES.authLogout, {
          method: "POST",
        });
      } catch {
        // Best-effort logout keeps the local state consistent even if the server session is gone.
      } finally {
        clearStoredSessionToken();
        this.user = null;
        this.pending = false;
        this.ready = true;
      }
    },
    async updateProfile(input: {
      nickname: string;
      avatarUrl: string | null;
      bio: string | null;
      region: string | null;
      website: string | null;
    }) {
      this.pending = true;
      this.error = null;

      try {
        const payload = await apiFetch<{ user: SessionUser }>(API_ROUTES.authMe, {
          method: "PATCH",
          body: JSON.stringify(input),
        });

        this.user = payload.user;
        return payload.user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Profile update failed";
        throw error;
      } finally {
        this.pending = false;
      }
    },
    async deleteAccount() {
      this.pending = true;
      this.error = null;
      let deleted = false;

      try {
        await apiFetch<void>(API_ROUTES.authMe, {
          method: "DELETE",
        });
        deleted = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Account deletion failed";
        throw error;
      } finally {
        if (deleted) {
          clearStoredSessionToken();
          this.user = null;
        }
        this.pending = false;
        this.ready = true;
      }
    },
  },
});
