import NodeGeocoder from "node-geocoder";
import config from "./env.js";

const geocoder = NodeGeocoder({
  provider: "google",
  apiKey: config.GOOGLE_MAPS_API_KEY,
});

export default geocoder;
