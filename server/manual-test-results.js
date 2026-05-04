import { getCareMatchResultsFromManualIntake } from "./scripts/results.js";

async function run() {
  try {
    const manualIntake = {
      who: "parent",
      parentAge: "under80",
      careTimeline: "within30",
      livingNow: "homeFamily",
      mobility: "walkWithHelp",
      lovedOneCare: ["dailyActivities", "medication", "mobilityAssist"],
      location: "Orlando, FL 32811",
      budgetMin: 4500,
      budgetMax: 8000,
      levelOfCare: "assisted",
      specialNeedsPreferences: ["privateRoom", "petFriendly", "physicalTherapy"],
      maxTravelMiles: 25,
    };

    if (process.env.SHOW_PAYLOAD === "1") {
      console.log("Manual intake payload:\n", JSON.stringify(manualIntake, null, 2));
    }

    const out = await getCareMatchResultsFromManualIntake(manualIntake);

    console.log("Manual search success. Results count:", out.results.length);
    console.log("First facility:", out.results[0]?.name);

    const showFull = process.env.SHOW_FULL === "1";
    if (showFull) {
      console.log("Full JSON response:\n", JSON.stringify(out, null, 2));
    } else {
      console.log(
        "Tip: run `SHOW_FULL=1 node manual-test-results.js` to print the full JSON payload."
      );
      console.log("Sample (first facility):\n", JSON.stringify(out.results[0], null, 2));
    }
  } catch (err) {
    console.error("Manual test failed:", err.message);
    if (err.status) console.error("Status:", err.status);
    if (err.raw_snippet) console.error("Raw snippet:", err.raw_snippet);
    if (err.partial) console.error("Partial keys:", Object.keys(err.partial));
  }
}

run();
