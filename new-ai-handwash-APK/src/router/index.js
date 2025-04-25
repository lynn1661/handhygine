import { createRouter, createWebHashHistory  } from "vue-router";
import BaseLayout from "@/layouts/BaseLayout.vue";
import Admin from "@/views/Admin.vue";
import Role from "@/views/Role.vue";
import RoleRank from "@/views/RoleRank.vue";
import AllRole from "@/views/AllRole.vue";
import RoleRankList from "@/views/RoleRankList.vue";
import Detecting from "@/views/Detecting.vue";
import Hands from "@/views/Hands.vue";
import HandwashingCompletion from "@/views/HandwashingCompletion.vue";
import UserFeedback from "@/views/UserFeedback.vue";

const routes = [
  {
    path: "/",
    component: BaseLayout,
  },
  {
    path: "/admin",
    component: Admin,
  },
  {
    path: "/role",
    component: Role,
  },
  {
    path: "/rolerank",
    component: RoleRank,
  },
  {
    path: "/allrole",
    component: AllRole,
  },
  {
    path: "/roleranklist",
    component: RoleRankList,
  },
  {
    path: "/detecting",
    component: Detecting,
  },
  {
    path: "/hands/:step",
    component: Hands,
  },
  {
    path: "/hands",
    redirect: "/hands/1"
  },
  {
    path: "/handwashingCompletion",
    component: HandwashingCompletion,
  },
  {
    path: "/feedback",
    component: UserFeedback,
  },
];

const router = createRouter({
  history: createWebHashHistory (),
  routes,
});

export default router;
