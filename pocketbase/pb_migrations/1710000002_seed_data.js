/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const artistsCollection = app.findCollectionByNameOrId("artists");
  const songsCollection = app.findCollectionByNameOrId("songs");
  const popularSearchesCollection = app.findCollectionByNameOrId("popular_searches");

  // 1. Seed Artists
  const artistsData = [
    {
      name: "The Weeknd",
      bio: "Kanadalik xonanda, qo'shiqchi va prodyuser. R&B va 80-yillar sint-pop musiqasi ustasi.",
      genre: "R&B / Synth-pop",
      avatar_class: "artist-one",
      avatar_symbol: "♫",
      monthly_listeners: 108500000
    },
    {
      name: "Dua Lipa",
      bio: "Britaniyalik qo'shiqchi va model. 'Future Nostalgia' albomi bilan jahon chartlarini zabt etgan.",
      genre: "Dance Pop / Disco",
      avatar_class: "artist-two",
      avatar_symbol: "★",
      monthly_listeners: 78200000
    },
    {
      name: "Travis Scott",
      bio: "Amerikalik reper, musiqachi va Cactus Jack Records asoschisi.",
      genre: "Hip-Hop / Trap",
      avatar_class: "artist-three",
      avatar_symbol: "⚡",
      monthly_listeners: 65400000
    },
    {
      name: "Yahyobek Yusupov",
      bio: "O'zbekistonlik iste'dodli ijodkor, vokalchi va zamonaviy kompozitor.",
      genre: "Indie Pop / Chillout",
      avatar_class: "artist-four",
      avatar_symbol: "♬",
      monthly_listeners: 1240000
    }
  ];

  const artistRecords = {};
  for (const a of artistsData) {
    const record = new Record(artistsCollection, a);
    app.save(record);
    artistRecords[a.name] = record;
  }

  // 2. Seed Songs
  const songsData = [
    {
      title: "Blinding Lights",
      artist: artistRecords["The Weeknd"].id,
      artist_name: "The Weeknd",
      duration: "3:20",
      cover_class: "cover-one",
      cover_number: "01",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      is_trending: true,
      plays: 124500,
      likes: 34200,
      tags: "pop synthwave 80s"
    },
    {
      title: "Levitating",
      artist: artistRecords["Dua Lipa"].id,
      artist_name: "Dua Lipa",
      duration: "3:23",
      cover_class: "cover-two",
      cover_number: "02",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      is_trending: true,
      plays: 98200,
      likes: 27100,
      tags: "dance pop disco"
    },
    {
      title: "Sicko Mode",
      artist: artistRecords["Travis Scott"].id,
      artist_name: "Travis Scott",
      duration: "5:12",
      cover_class: "cover-three",
      cover_number: "03",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      is_trending: true,
      plays: 87400,
      likes: 21900,
      tags: "hip-hop trap rap"
    },
    {
      title: "Yulduzlar Asta",
      artist: artistRecords["Yahyobek Yusupov"].id,
      artist_name: "Yahyobek Yusupov",
      duration: "3:45",
      cover_class: "cover-four",
      cover_number: "04",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      is_trending: true,
      plays: 45200,
      likes: 12800,
      tags: "uzbek pop indie chill yahyobek"
    },
    {
      title: "Save Your Tears",
      artist: artistRecords["The Weeknd"].id,
      artist_name: "The Weeknd",
      duration: "3:35",
      cover_class: "cover-one",
      cover_number: "05",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      is_trending: false,
      plays: 64100,
      likes: 18900,
      tags: "pop synthwave the weeknd"
    },
    {
      title: "Don't Start Now",
      artist: artistRecords["Dua Lipa"].id,
      artist_name: "Dua Lipa",
      duration: "3:03",
      cover_class: "cover-two",
      cover_number: "06",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
      is_trending: false,
      plays: 59300,
      likes: 14700,
      tags: "nu-disco dance dua lipa"
    }
  ];

  for (const s of songsData) {
    const record = new Record(songsCollection, s);
    app.save(record);
  }

  // 3. Seed Popular Searches
  const searchQueries = [
    { query: "The Weeknd", search_count: 540 },
    { query: "Dua Lipa", search_count: 420 },
    { query: "Travis Scott", search_count: 380 },
    { query: "Yahyobek", search_count: 610 },
    { query: "Synthwave", search_count: 290 },
    { query: "Pop", search_count: 310 }
  ];

  for (const q of searchQueries) {
    const record = new Record(popularSearchesCollection, q);
    app.save(record);
  }
}, (app) => {
  // down queries (handled by schema drop)
});
