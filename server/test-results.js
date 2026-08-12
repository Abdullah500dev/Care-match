import { getCareMatchResults } from "./scripts/results.js";

async function run() {
  try {
    const userSearch = {
      zip_code: "32811",
      location: "Orlando, FL",
      care_levels: ["Assisted Living"],
      amenities: [
        "Wheelchair Accessible Entrance",
        "On-site Parking",
        "Outdoor Areas",
      ],
      services: ["Social Activities", "Vibrant Community"],
      budget_min: 6500,
      budget_max: 10000,
      max_distance_miles: 20,
      keywords: [
        "wheelchair-friendly entrances",
        "accessible parking",
        "outdoor areas",
        "social activities",
        "vibrant community environment",
        "overall quality",
      ],
    };

    const out = await getCareMatchResults(userSearch);

    console.log("Success. Results count:", out.results.length);
    console.log("First facility:", out.results[0]?.name);

    const showFull = process.env.SHOW_FULL === "1";
    if (showFull) {
      console.log("Full JSON response:\n", JSON.stringify(out, null, 2));
    } else {
      console.log(
        "Tip: run `SHOW_FULL=1 node test-results.js` to print the full JSON payload (it can be large)."
      );
      console.log("Sample (first facility):\n", JSON.stringify(out.results[0], null, 2));
    }
  } catch (err) {
    console.error("Test failed:", err.message);
    if (err.status) console.error("Status:", err.status);
    if (err.raw_snippet) console.error("Raw snippet:", err.raw_snippet);
    if (err.partial) console.error("Partial keys:", Object.keys(err.partial));
  }
}

run();