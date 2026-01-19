import { createRouter, createWebHistory } from "vue-router";
import { api } from "./lib/api";

const LoginView = () => import("./views/LoginView.vue");
const HomeView = () => import("./views/HomeView.vue");
const VotingView = () => import("./views/VotingView.vue");
const VerifierView = () => import("./views/VerifierView.vue");
const ReportView = () => import("./views/ReportView.vue");

const AdminSettingsView = () => import("./views/admin/AdminSettingsView.vue");
const AdminUsersView = () => import("./views/admin/AdminUsersView.vue");
const AdminBallotsView = () => import("./views/admin/AdminBallotsView.vue");
const AdminLogsView = () => import("./views/admin/AdminLogsView.vue");
const AdminTicketsView = () => import("./views/admin/AdminTicketsView.vue");

const APP_MODE = (import.meta.env.VITE_APP_MODE || "voting").toLowerCase();
const IS_VERIFIER_APP = APP_MODE === "verifier";

const routes = [
  { path: "/verify", name: "verify", component: VerifierView },
  { path: "/report", name: "report", component: ReportView },

  ...(!IS_VERIFIER_APP
    ? [
        { path: "/login", name: "login", component: LoginView },
        { path: "/", name: "home", component: HomeView },
        {
          path: "/ballots/:id",
          name: "ballot",
          component: VotingView,
          props: true,
        },

        // --- Admin ---
        {
          path: "/admin/settings",
          name: "admin-settings",
          component: AdminSettingsView,
          meta: { requiresAdmin: true },
        },
        {
          path: "/admin/users",
          name: "admin-users",
          component: AdminUsersView,
          meta: { requiresAdmin: true },
        },
        {
          path: "/admin/ballots",
          name: "admin-ballots",
          component: AdminBallotsView,
          meta: { requiresAdmin: true },
        },
        {
          path: "/admin/logs",
          name: "admin-logs",
          component: AdminLogsView,
          meta: { requiresAdmin: true },
        },
        {
          path: "/admin/tickets",
          name: "admin-tickets",
          component: AdminTicketsView,
          meta: { requiresAdmin: true },
        },
      ]
    : []),

  {
    path: "/:pathMatch(.*)*",
    redirect: () => (IS_VERIFIER_APP ? { name: "verify" } : { name: "login" }),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (IS_VERIFIER_APP) {
    return true;
  }

  // Voting-App: öffentlich: login/verify/report
  if (to.name === "login" || to.name === "verify" || to.name === "report") {
    return true;
  }

  try {
    const r = await api("/auth/me");
    if (!r.ok) return { name: "login" };

    const me = await r.json();
    if (to.meta.requiresAdmin && me.role !== "admin") return { name: "home" };
    return true;
  } catch {
    return { name: "login" };
  }
});

export default router;
