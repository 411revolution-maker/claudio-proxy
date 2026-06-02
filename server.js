/**
 * Claudio NetEase API Proxy
 * Deploy to Fly.io (HK) or Render (SG) to bypass China IP restriction
 */
const express = require("express");
const netease = require("NeteaseCloudMusicApi");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const NE_COOKIE = process.env.NE_COOKIE || "__csrf=9b91044990f581b1c5d4fa4db36621ad; __snaker__id=YkgKaoKO1HV6EUn9; _iuqxldmzr_=32; _ntes_nnid=4cad98e45bb2f2d830243a5e2b0ae196,1778324344390; _ntes_nuid=4cad98e45bb2f2d830243a5e2b0ae196; gdxidpyhxdE=L%2FKda5WaOzgf4IlArTTX%5CfpIjsWXCOIBpNuBc17O96zQBO7sth7txP1usZ3LOj9B8MosThjic5%5CcwnQE7bDxvk7YWYEVCJygjlYww4%2F8Q81THlsXEQag9TyEq8LfTH5HwJ51zNsH4wlIOEkiXtCmPCQocRDB%2FcW6EIxpzBeEab6Qev3x%3A1780293016975; JSESSIONID-WYYY=5PXb7Sz%5CefZXSBXwDc%5CYYkpq%2FQu5Pp5g%2FpTOl4NmqOzaUx4zFNd%5C%2FyEGN6ONVb81xKXunNz%5CJD375gH6I4v%2FNhN4KXpZiWVmPvXOanBUu1DdBze%5ChheW4ub8CuWaI6REOkKecp3fX6RTTRZIBcMXEq85SAEAe28%2FHnWn5mzqjf7pa7at%3A1780293973011; MUSIC_A_T=1760511660982; MUSIC_R_T=1760511729374; MUSIC_U=0002A5F0F77D89AF2FD81935A84969984A9CDBB8E4ED293767FAB539A394D707F611923697CAD3DB2142C45DEF533BCBCA0E671A09C99ADD07ECB073C19AF3FDA7FE8BA897719D4E7429AD3257C56B583C252A68E9E0393E0B2B483A9E65A0833E7C7A6596DEB1CB5307F89CB86228574C7E8AA9A8314D05631F9726CAF23FAE18C8F58E1CEF06D89D9E3D2F22EBCAAE52F4F33F36E1B0259F9B8047959C3F269CFD69528504485D0878BA054D50A68A7F53B82AE079C7DE2EB628C783BCA20994C58D89A5D7510BCBC0C74A519A731539723E6369B0E83B9245A24FE73955B23AD2148EE5905BDFAD8D98F75E15A832E3AC862240F71B1898B2DCDB4A9E4189CED8C56C28C67C99F5C23B802E60127B1826802963CBC7E142B50EA5DCEBA975D3828F2B3BE5A95AB3B623D3664264F73900431ACB6893F41BC732B4A1F6AAEAAB8865179F9CAA081B2EA113CE8872A24723E242548107C9649BC5DD43CC182795FCFC06EF1346207B8769018BA4E4D1DD03A03852CCDD3EFF8A070B12018404F44009FE05F778D919119512B93860C3EB7B6DCDBB2B28D1A0579DC71088BAE2FD; NMTID=00Otw2j7P2AfIfx10uToNa7fEP2CfMAAAGeDGQVeA; ntes_kaola_ad=1; ntes_utid=tid._.g%252BGlS0DWDO1AA0BVVVOGvEDkKWEKAqxn._.0; sDeviceId=YD-1HYPnat3jcdEEkQVBAKD%2BUWwPCAPFrw2; WEVNSM=1.0.0; WM_NI=bDl652%2BCwwjGUShV3IzZzCKCXhMCHuHGMcFnmBfE3MXvM49JaxLpSjtJ6k5QQGddaymSrQAPCHZIgJvg5jngXLHQ0tDH4e0VWewDyrCqx7tCLBK3QYPfhXB4TOYJtgxlTW0%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6ee8dcf619794ad99d26289b48bb7c84f968f8b82c23d9a9f99d2e95f898dbf88f52af0fea7c3b92aa29ca4d7b83ae99db998e94d978da8b7b243ba86b6a4ca499cb883a4cb7f8c998384c566af9eaaa6b2479caa83d5bc42a3a88491d262b896fa8cb85b9399ac85e473af8dbeb2c45c819896aae642b6b9fb8bed6d9c9488b2b3808898fc86b35e95bbb9a5fc7a81afb8d8f749909e85d4d45394baa8b9c140989197abf76dbcb49cb8b337e2a3; WM_TID=39OZBmMfyGJFEVAEFBLH%2FVGgaXBaSMF2; WNMCID=fsazmy.1778324349352.01.0";

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
