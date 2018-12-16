const Datastore = require('@google-cloud/datastore');
const axios = require('axios');

async function read(req, res) {
  const datastore = new Datastore();

  try {
    // Returns an array???
    // https://github.com/googleapis/google-cloud-node/issues/2749
    const [settings] = await datastore.get(
      datastore.key(['SiteSettings', process.env.DATASTORE_SITE_SETTINGS_ID]),
    );
    res.send(JSON.stringify(settings));
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}

async function create(req, res) {
  if (!req.body) {
    res.sendStatus(400);
    return;
  }

  const { password, ...siteSettings } = req.body;

  if (password !== process.env.PASSWORD) {
    res.sendStatus(403);
    return;
  }

  const datastore = new Datastore();

  try {
    await datastore.upsert({
      key: datastore.key([
        'SiteSettings',
        process.env.DATASTORE_SITE_SETTINGS_ID,
      ]),
      data: siteSettings,
    });
  } catch (err) {
    res.sendStatus(500);
    return;
  }

  try {
    await Promise.all([
      axios.post(process.env.SITE_DEPLOY_HOOK),
      axios.post(process.env.ADMIN_SITE_DEPLOY_HOOK),
    ]);
  } catch (err) {
    res.sendStatus(500);
    return;
  }

  res.sendStatus(200);
}

function handler(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  switch (req.method) {
    case 'GET':
      read(req, res);
      return;

    case 'POST':
      create(req, res);
      return;

    case 'OPTIONS':
      res.set('Access-Control-Allow-Methods', 'POST, GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.sendStatus(204);
      return;

    default:
      res.sendStatus(404);
      return;
  }
}

module.exports = { handler };
