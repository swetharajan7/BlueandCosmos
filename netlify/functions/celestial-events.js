const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

exports.handler = async function(event, context) {
  const year = event.queryStringParameters.year;
  const month = event.queryStringParameters.month;
  const day = event.queryStringParameters.day;

  const url = `https://in-the-sky.org/newscal.php?year=${year}&month=${month}&day=${day}&maxdiff=7`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: "Failed to fetch events" })
      };
    }

    const html = await res.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const items = [...document.querySelectorAll("ul.daylist li")].map(li =>
      li.textContent.trim()
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ events: items })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: error.message })
    };
  }
};
