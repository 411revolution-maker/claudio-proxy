/**
 * Claudio NetEase API Proxy — Render Singapore
 */
const express = require("express");
const netease = require("NeteaseCloudMusicApi");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Set cookie globally (env var takes priority, with hardcoded fallback)
netease.cookie = process.env.NE_COOKIE || "__csrf=9b91044990f581b1c5d4fa4db36621ad; MUSIC_U=0002A5F0F77D89AF2FD81935A84969984A9CDBB8E4ED293767FAB539A394D707F611923697CAD3DB2142C45DEF533BCBCA0E671A09C99ADD07ECB073C19AF3FDA7FE8BA897719D4E7429AD3257C56B583C252A68E9E0393E0B2B483A9E65A0833E7C7A6596DEB1CB5307F89CB86228574C7E8AA9A8314D05631F9726CAF23FAE18C8F58E1CEF06D89D9E3D2F22EBCAAE52F4F33F36E1B0259F9B8047959C3F269CFD69528504485D0878BA054D50A68A7F53B82AE079C7DE2EB628C783BCA20994C58D89A5D7510BCBC0C74A519A731539723E6369B0E83B9245A24FE73955B23AD2148EE5905BDFAD8D98F75E15A832E3AC862240F71B1898B2DCDB4A9E4189CED8C56C28C67C99F5C23B802E60127B1826802963CBC7E142B50EA5DCEBA975D3828F2B3BE5A95AB3B623D3664264F73900431ACB6893F41BC732B4A1F6AAEAAB8865179F9CAA081B2EA113CE8872A24723E242548107C9649BC5DD43CC182795FCFC06EF1346207B8769018BA4E4D1DD03A03852CCDD3EFF8A070B12018404F44009FE05F778D919119512B93860C3EB7B6DCDBB2B28D1A0579DC71088BAE2FD";

function withCookie(params = {}) {
  return netease.cookie ? { ...params, cookie: netease.cookie } : params;
}

// Health
app.get("/", (_, res) => res.json({ status: "ok", cookie: !!netease.cookie }));

// Search
app.get("/api/search", async (req, res) => {
  try {
    const { keywords, limit = "10" } = req.query;
    const result = await netease.cloudsearch(withCookie({ keywords, limit: parseInt(limit), type: 1 }));
    const songs = (result.body?.result?.songs || []).map((s) => ({
      id: String(s.id), title: s.name, artist: (s.ar || []).map((a) => a.name).join("/"),
      album: s.al?.name || "", albumCover: s.al?.picUrl || "", duration: s.dt || 0,
    }));
    res.json({ songs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Song URL
app.get("/api/song-url/:id", async (req, res) => {
  try {
    const result = await netease.song_url_v1(withCookie({ id: req.params.id, level: "lossless" }));
    const data = result.body?.data?.[0];
    res.json({ id: req.params.id, url: data?.url || null, type: data?.type || "" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lyrics
app.get("/api/lyrics/:id", async (req, res) => {
  try {
    const result = await netease.lyric_new(withCookie({ id: req.params.id }));
    if (result.body?.lrc?.lyric) res.json({ lyric: result.body.lrc.lyric });
    else if (result.body?.yrc?.lyric) res.json({ lyric: result.body.yrc.lyric });
    else res.json({ lyric: null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Batch song URLs
app.post("/api/song-urls", async (req, res) => {
  try {
    const { tracks } = req.body;
    if (!Array.isArray(tracks)) return res.json({ urls: [] });
    const results = [];
    for (const track of tracks.slice(0, 30)) {
      try {
        let songId = track.id;
        if (!songId) {
          const sr = await netease.cloudsearch(withCookie({ keywords: `${track.title} ${track.artist}`, limit: 1, type: 1 }));
          songId = sr.body?.result?.songs?.[0]?.id;
        }
        if (songId) {
          const urlRes = await netease.song_url_v1(withCookie({ id: String(songId), level: "lossless" }));
          const d = urlRes.body?.data?.[0];
          const detailRes = await netease.song_detail(withCookie({ ids: String(songId) }));
          const s = detailRes.body?.songs?.[0];
          results.push({
            id: String(songId), title: s?.name || track.title,
            artist: (s?.ar || []).map((a) => a.name).join("/") || track.artist,
            albumCover: s?.al?.picUrl || "", url: d?.url || null,
          });
        }
      } catch {}
    }
    res.json({ urls: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Playlist tracks
app.get("/api/playlist/:id", async (req, res) => {
  try {
    const allTracks = [];
    let offset = 0, limit = 200;
    while (true) {
      const result = await netease.playlist_track_all(withCookie({ id: req.params.id, offset, limit }));
      const tracks = result.body?.songs || result.body?.trackIds || [];
      if (!tracks.length) break;
      allTracks.push(...tracks.map((t) => ({
        id: String(t.id), title: t.name,
        artist: (t.ar || []).map((a) => a.name).join("/"),
        album: t.al?.name || "",
      })));
      offset += limit;
      if (tracks.length < limit) break;
    }
    res.json({ tracks: allTracks, count: allTracks.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`[Proxy] :${PORT} cookie:${!!netease.cookie}`));
