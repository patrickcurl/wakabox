require("dotenv").config();
const moment = require("moment");
const { WakaTimeClient, RANGE } = require("wakatime-client");
const Octokit = require("@octokit/rest");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  WAKATIME_API_KEY: wakatimeApiKey
} = process.env;

const wakatime = new WakaTimeClient(wakatimeApiKey);

const octokit = new Octokit({
  auth: `token ${githubToken}`
});

async function main() {
  const stats = await wakatime.getMyStats({ range: RANGE.LAST_7_DAYS });
  await updateGist(stats);
}

async function updateGist(stats) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  const lines = [];
  for (let i = 0; i < 5; i++) {
    const data = stats.data.languages[i];
    const { name, percent, text: time } = data;

    const line = [
      name.padEnd(11),
      time.padEnd(14),
      generateBarChart(percent, 21),
      String(percent.toFixed(1)).padStart(5) + "%"
    ];

    lines.push(line.join(" "));
  }

  try {
    // Get original filename to update that same file
    const startDay = moment()
      .weekday(0)
      .format("YYYY-MM-DD");
    const endDay = moment()
      .weekday(6)
      .format("YYYY-MM-DD");
    const filename = `📊 Development Breakdown Week of ${startDay}`;
    //const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `${filename}`,
          content: lines.join("\n")
        }
      }
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

function generateBarChart(percent, size) {
  const syms = "░▏▎▍▌▋▊▉█";

  const frac = (size * 8 * percent) / 100;
  const barsFull = Math.floor(frac / 8);
  const semi = frac % 8;
  const barsEmpty = size - barsFull - 1;

  return [
    syms.substring(8, 9).repeat(barsFull),
    syms.substring(semi, semi + 1),
    syms.substring(0, 1).repeat(barsEmpty)
  ].join("");
}

(async () => {
  await main();
})();
