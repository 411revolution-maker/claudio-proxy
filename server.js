/**
 * Claudio NetEase API Proxy
 * Deploy to Fly.io (HK) or Render (SG) to bypass China IP restriction
 */
const express = require("express");
const netease = require("NeteaseCloudMusicApi");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const NE_COOKIE = process.env.NE_COOKIE || "";

let api = null;
function getAPI() {
  if (!api) {
    api = netease;
    if (NE_COOKIE) {
      netease.cookie = NE_COOKIE;
      console.log("[Netease] Cookie set");
    }
  }
  return api;
}

function withCookie(params = {}) {
  return NE_COOKIE ? { ...params, cookie: NE_COOKIE } : params;
}

// Health check
app.get("/", (_, res) => res.json({ status: "ok", service: "claudio-netease-proxy" }));

// Search
app.get("/api/search", async (req, res) => {
  try {
    const { keywords, limit = "10" } = req.query;
    const result = await netease.cloudsearch(
      withCookie({ keywords, limit: parseInt(limit), type: 1 })
    );
    const songs = (result.body?.result?.songs || []).map((s) => ({
      id: String(s.id),
      title: s.name,
      artist: (s.ar || []).map((a) => a.name).join("/"),
      album: s.al?.name || "",
      albumCover: s.al?.picUrl || "",
      duration: s.dt || 0,
    }));
    res.json({ songs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Song URL
app.get("/api/song-url/:id", async (req, res) => {
  try {
    const result = await netease.song_url_v1(
      withCookie({ id: req.params.id, level: "lossless" })
    );
    const data = result.body?.data?.[0];
    res.json({
      id: req.params.id,
      url: data?.url || null,
      type: data?.type || "",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Song detail
app.get("/api/song-detail/:id", async (req, res) => {
  try {
    const result = await netease.song_detail(withCookie({ ids: req.params.id }));
    const s = result.body?.songs?.[0];
    if (!s) return res.json(null);
    res.json({
      id: String(s.id),
      title: s.name,
      artist: (s.ar || []).map((a) => a.name).join("/"),
      album: s.al?.name || "",
      albumCover: s.al?.picUrl || "",
      duration: s.dt || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lyrics
app.get("/api/lyrics/:id", async (req, res) => {
  try {
    const result = await netease.lyric_new(withCookie({ id: req.params.id }));
    if (result.body?.lrc?.lyric) {
      res.json({ lyric: result.body.lrc.lyric });
    } else if (result.body?.yrc?.lyric) {
      res.json({ lyric: result.body.yrc.lyric });
    } else {
      res.json({ lyric: null });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Batch song URLs (for player prefetch)
app.post("/api/song-urls", async (req, res) => {
  try {
    const { tracks } = req.body;
    if (!Array.isArray(tracks)) return res.json({ urls: [] });
    const results = [];
    for (const track of tracks.slice(0, 30)) {
      try {
        let songId = track.id;
        if (!songId) {
          // Search by title + artist
          const sr = await netease.cloudsearch(
            withCookie({ keywords: `${track.title} ${track.artist}`, limit: 1, type: 1 })
          );
          const s = sr.body?.result?.songs?.[0];
          songId = s?.id;
        }
        if (songId) {
          const urlRes = await netease.song_url_v1(withCookie({ id: String(songId), level: "lossless" }));
          const d = urlRes.body?.data?.[0];
          const detailRes = await netease.song_detail(withCookie({ ids: String(songId) }));
          const s = detailRes.body?.songs?.[0];
          results.push({
            id: String(songId),
            title: s?.name || track.title,
            artist: (s?.ar || []).map((a) => a.name).join("/") || track.artist,
            albumCover: s?.al?.picUrl || "",
            url: d?.url || null,
          });
        }
      } catch {}
    }
    res.json({ urls: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Playlist tracks
app.get("/api/playlist/:id", async (req, res) => {
  try {
    const allTracks = [];
    let offset = 0;
    const limit = 200;
    while (true) {
      const result = await netease.playlist_track_all(
        withCookie({ id: req.params.id, offset, limit })
      );
      const tracks = result.body?.songs || result.body?.trackIds || [];
      if (tracks.length === 0) break;
      allTracks.push(
        ...tracks.map((t) => ({
          id: String(t.id),
          title: t.name,
          artist: (t.ar || []).map((a) => a.name).join("/"),
          album: t.al?.name || "",
        }))
      );
      offset += limit;
      if (tracks.length < limit) break;
    }
    res.json({ tracks: allTracks, count: allTracks.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Proxy] Listening on port ${PORT}`);
  console.log(`[Proxy] Cookie: ${NE_COOKIE ? "set" : "not set"}`);
});
