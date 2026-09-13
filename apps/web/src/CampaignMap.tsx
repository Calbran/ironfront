import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { World } from "../../../packages/game-core/src/index";
import { miniatureScene, type StudyStats } from "./experiments/miniatureScene";
import type { MiniatureData } from "./experiments/miniatureData";
import "./experiments/liveCampaign.css";

export type CampaignMapProps = {
  world: World;
  selected: number | null;
  onSelect: (id: number) => void;
  initialZoom?: number;
  onSelectSettlement?: (region: number, feature: string) => void;
  selectedSettlement?: string | null;
  resyncKey?: number;
  preview?: boolean;
  focus?: { region: number; revision: number } | null;
  selectedArmy?: number | null;
  onSelectArmy?: (id: number) => void;
  onOrder?: (region: number, cover?: string) => void;
  selectedSquads?: string[];
  placingSquads?: boolean;
  onSelectSquad?: (id: string, additive: boolean) => void;
  onAttackTarget?: (id: string) => void;
  onLocalPoint?: (x: number, y: number, append: boolean) => void;
  onCaptureSettlement?: (region: number, feature: string) => void;
  onDeselect?: () => void;
  selectedArmies?: number[];
  onSelectArmies?: (ids: number[], additive: boolean) => void;
};

const ArchivedPixiMap = lazy(() =>
  import("./ContinentalMap").then((module) => ({ default: module.MapView })),
);

declare global {
  interface Window {
    __liveStudy?: ReturnType<typeof miniatureScene>;
  }
}

function ThreeCampaign(props: CampaignMapProps) {
  const latest = useRef(props);
  latest.current = props;
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof miniatureScene>>(undefined);
  const [data, setData] = useState<MiniatureData>();
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StudyStats>();
  const [strategy, setStrategy] = useState(false);
  const [winter, setWinter] = useState(false);

  useEffect(() => {
    setData(undefined);
    const worker = new Worker(
      new URL("./experiments/miniature.worker.ts", import.meta.url),
      {
      type: "module",
      },
    );
    worker.onmessage = (event) => {
      if (event.data.error) setError(event.data.error);
      else setData(event.data);
    };
    worker.onerror = (event) => setError(event.message);
    worker.postMessage({ world: latest.current.world, seed: "" });
    return () => worker.terminate();
  }, [props.world.id]);

  useEffect(() => {
    if (!host.current || !data) return;
    const current = latest.current;
    data.world = current.world;
    try {
      const api = miniatureScene(
        host.current,
        data,
        (id) => latest.current.onSelect(id),
        setStats,
        setError,
        (ids) => latest.current.onSelectArmies?.(ids, false),
        {
          onMapTap: (x, y) => {
            if (!latest.current.placingSquads) return false;
            latest.current.onLocalPoint?.(x, y, false);
            return true;
          },
          onSelectSquad: (id, add) => latest.current.onSelectSquad?.(id, add),
          onAttackTarget: (id) => latest.current.onAttackTarget?.(id),
          onLocalPoint: (x, y, append) =>
            latest.current.onLocalPoint?.(x, y, append),
          onCaptureSettlement: (region, feature) =>
            latest.current.onCaptureSettlement?.(region, feature),
          onOrder: (region, feature) =>
            latest.current.onOrder?.(region, feature),
        },
      );
      scene.current = api;
      window.__liveStudy = api;
      api.updateWorld(current.world);
      api.setLoad(0, false);
      api.view("continent");
      api.setSelectedSquads(current.selectedSquads ?? []);
      return () => {
        api.dispose();
        scene.current = undefined;
        window.__liveStudy = undefined;
      };
    } catch (caught) {
      setError(String(caught));
    }
  }, [data]);

  useEffect(() => {
    scene.current?.updateWorld(props.world);
    scene.current?.setSelectedSquads(props.selectedSquads ?? []);
  }, [props.world, props.selectedSquads]);
  useEffect(() => {
    if (props.focus) scene.current?.focusRegion(props.focus.region);
  }, [props.focus, data]);
  useEffect(() => {
    scene.current?.configure({
      strategy,
      snow: winter,
      sprites: false,
      textures: false,
      borders: true,
      motion: true,
      shadows: true,
    });
  }, [strategy, winter, data]);

  return (
    <div className="live-three-map">
      <div className="live-three-host" ref={host} />
      {!data && (
        <div className="live-three-status" role="status">
          Preparing campaign scenery…
        </div>
      )}
      {error && (
        <div className="live-three-status" role="alert">
          {error}
        </div>
      )}
      {!props.preview && (
        <>
          <div className="live-three-toolbar">
            <button onClick={() => scene.current?.view("continent")}>Fit</button>
            <button onClick={() => scene.current?.view("regional")}>
              Regional
            </button>
            <button
              onClick={() => {
                const own = props.world.tactics?.squads.find(
                  (squad) =>
                    squad.owner === props.world.vision?.owner &&
                    squad.strength > 0,
                );
                if (own) scene.current?.focusRegion(own.region);
              }}
            >
              Own forces
            </button>
            <button
              aria-label="Strategy view"
              aria-pressed={strategy}
              onClick={() => setStrategy(!strategy)}
            >
              {strategy ? "Strategy" : "Terrain"}
            </button>
            <button
              aria-pressed={winter}
              onClick={() => setWinter(!winter)}
            >
              Winter
            </button>
            <span>
              {stats?.fps ?? "—"} FPS · server revision{" "}
              {props.world.tactics?.revision ?? 0}
            </span>
          </div>
          <div className="live-three-help">
            Left-drag selects · Shift adds/queues · Right-click moves or attacks ·
            Right-drag/WASD pans · Escape clears
          </div>
        </>
      )}
    </div>
  );
}

export function MapView(
  props: CampaignMapProps & { archivedPixi?: boolean },
) {
  if (props.archivedPixi) {
    return (
      <Suspense
        fallback={
          <div className="map-shell preview-loading">
            Loading archived renderer…
          </div>
        }
      >
        <ArchivedPixiMap {...props} />
      </Suspense>
    );
  }
  return <ThreeCampaign {...props} />;
}
