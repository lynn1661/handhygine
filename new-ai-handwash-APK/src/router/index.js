import { createRouter, createWebHashHistory  } from "vue-router";
import Role from "@/views/Role.vue";
import Detecting from "@/views/Detecting.vue";
import Hands from "@/views/Hands.vue";
import HandwashingCompletion from "@/views/HandwashingCompletion.vue";

const routes = [
  {
    path: "/",
    component: Role,
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
];

const router = createRouter({
  history: createWebHashHistory (),
  routes,
});

export default router;
