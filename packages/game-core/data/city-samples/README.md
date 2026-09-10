# Real city street samples

`ancoats.ts` is a derived OpenStreetMap database, licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). © OpenStreetMap contributors. [Attribution and source terms](https://www.openstreetmap.org/copyright). The data license applies to the sample database; this notice does not relicense the application code.

Source: Overpass API, `https://overpass-api.de/api/interpreter`, bounding box 53.477,-2.236,53.487,-2.219 (Ancoats and adjacent Manchester districts). Retrieval timestamp and normalization coordinates are embedded in the data. Contemporary street geometry is a reference, not a reconstruction of historical Ancoats. Building/address tags are not included in the shipped sample.

Reproduce by saving this Overpass query response to a local JSON file, then running `node --import tsx scripts/import-city-sample.ts /path/to/response.json`:

```overpass
[out:json][timeout:25];
(way[highway][highway!~"footway|steps|cycleway|path"](53.477,-2.236,53.487,-2.219);
 way[waterway](53.477,-2.236,53.487,-2.219);
 way[building](53.477,-2.236,53.487,-2.219););
out geom;
```

The converter projects coordinates into local normalized coordinates, retains way IDs, filters area roads, parking aisles and motorway/trunk roads, and retains canal/river ways. Geometry is bounded to the local sample by consecutive-vertex runs. This is not a full OSM transport parser: road grade separation, turn restrictions, tunnels and canal locks are not simulated. All bundled derivative geometry is available here, offline. Keep attribution visible in the diorama and preserve this source/license notice when distributing the sample.
