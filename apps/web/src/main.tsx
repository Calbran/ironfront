import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/barlow-condensed/latin-500.css";
const Archived = lazy(() => import("./ArchivedCampaignEntry"));
const Campaign = lazy(() => import("./BattlefieldApp"));
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<p>Loading Ironfront…</p>}>
      {document.documentElement.dataset.renderer === "pixi" ? (
        <Archived />
      ) : (
        <Campaign />
      )}
    </Suspense>
  </React.StrictMode>,
);
