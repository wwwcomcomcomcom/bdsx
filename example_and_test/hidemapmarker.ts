import { setMapMarkerFilter } from "bdsx/bds/engine/mapmarker";

// Hide every player's marker on every map. Return true to keep a marker: for example, `actor => !actor.hasTag("hidden")`
// hides only the players tagged "hidden". Other entities keep theirs.
setMapMarkerFilter(actor => !actor.isPlayer());
