/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Artists Collection
  const artists = new Collection({
    name: "artists",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      { name: "name", type: "text", required: true },
      { name: "bio", type: "text" },
      { name: "genre", type: "text" },
      { name: "avatar_class", type: "text" },
      { name: "avatar_symbol", type: "text" },
      { name: "monthly_listeners", type: "number" }
    ]
  });
  app.save(artists);

  // 2. Songs Collection
  const songs = new Collection({
    name: "songs",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      { name: "title", type: "text", required: true },
      {
        name: "artist",
        type: "relation",
        collectionId: artists.id,
        maxSelect: 1,
        cascadeDelete: false
      },
      { name: "artist_name", type: "text", required: true },
      { name: "duration", type: "text" },
      { name: "cover_class", type: "text" },
      { name: "cover_number", type: "text" },
      { name: "audio_url", type: "text" },
      { name: "is_trending", type: "bool" },
      { name: "plays", type: "number" },
      { name: "likes", type: "number" },
      { name: "tags", type: "text" }
    ]
  });
  app.save(songs);

  // 3. Popular Searches Collection
  const popularSearches = new Collection({
    name: "popular_searches",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      { name: "query", type: "text", required: true },
      { name: "search_count", type: "number" }
    ]
  });
  app.save(popularSearches);

  // 4. Favorites Collection
  const favorites = new Collection({
    name: "favorites",
    type: "base",
    listRule: "@request.auth.id != '' && user = @request.auth.id",
    viewRule: "@request.auth.id != '' && user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    deleteRule: "@request.auth.id != '' && user = @request.auth.id",
    fields: [
      {
        name: "user",
        type: "relation",
        collectionId: "_pb_users_auth_",
        maxSelect: 1,
        required: true,
        cascadeDelete: true
      },
      {
        name: "song",
        type: "relation",
        collectionId: songs.id,
        maxSelect: 1,
        required: true,
        cascadeDelete: true
      }
    ]
  });
  app.save(favorites);
}, (app) => {
  try {
    const favorites = app.findCollectionByNameOrId("favorites");
    if (favorites) app.delete(favorites);
  } catch (e) {}

  try {
    const popularSearches = app.findCollectionByNameOrId("popular_searches");
    if (popularSearches) app.delete(popularSearches);
  } catch (e) {}

  try {
    const songs = app.findCollectionByNameOrId("songs");
    if (songs) app.delete(songs);
  } catch (e) {}

  try {
    const artists = app.findCollectionByNameOrId("artists");
    if (artists) app.delete(artists);
  } catch (e) {}
});
