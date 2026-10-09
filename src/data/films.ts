// Settings for the "Movies" section on the About page.
// The section hides itself until you set a real username below.

export const letterboxd = {
  // Your Letterboxd username: the part after letterboxd.com/ in your profile link.
  username: "Soudan111",

  // OPTIONAL, for favorites that update automatically.
  // Letterboxd doesn't publish your four profile "Favorites" in any feed, but it
  // does publish your lists. Make a list on Letterboxd (for example "Favorites"),
  // then put its URL slug here. For letterboxd.com/you/list/my-favorites/ use
  // "my-favorites". Leave "" to use the manual list below instead.
  favoritesList: "",

  // How many films to show in each row.
  favoritesCount: 8,
  recentCount: 6,
};

// MANUAL FAVORITES (used when favoritesList is empty, or if that list can't be read).
// Posters are optional. To add one, save the image in public/images/films/ and
// set poster to "images/films/your-file.jpg". Without a poster you get a title tile.
//
//   { title: "Spirited Away", year: "2001", poster: "images/films/spirited-away.jpg",
//     href: "https://letterboxd.com/film/spirited-away/" },
export interface ManualFilm {
  title: string;
  year?: string;
  poster?: string;
  href?: string;
}

export const manualFavorites: ManualFilm[] = [];
