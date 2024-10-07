import { createRouter, createWebHashHistory  } from "vue-router";
import BaseLayout from "@/layouts/BaseLayout.vue";
import Detecting from "@/views/Detecting.vue";
import Hands from "@/views/Hands.vue";
import Hands2 from "@/views/Hands2.vue";
import Hands3 from "@/views/Hands3.vue";
import Hands4 from "@/views/Hands4.vue";
import Hands5 from "@/views/Hands5.vue";
import Hands6 from "@/views/Hands6.vue";
import Hands7 from "@/views/Hands7.vue";
import HandwashingCompletion from "@/views/HandwashingCompletion.vue";
const routes = [
  {
    path: "/",
    component: BaseLayout,
  },
  {
    path: "/detecting",
    component: Detecting,
  },
  {
    path: "/hands",
    component: Hands,
  },
  {
    path: "/hands2",
    component: Hands2,
  },
  {
    path: "/hands3",
    component: Hands3,
  },
  {
    path: "/hands4",
    component: Hands4,
  },
  {
    path: "/hands5",
    component: Hands5,
  },
  {
    path: "/hands6",
    component: Hands6,
  },
  {
    path: "/hands7",
    component: Hands7,
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
