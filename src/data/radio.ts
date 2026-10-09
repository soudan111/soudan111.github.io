// Settings for the Radio page (your Spinitron playlist archive).

export const radio = {
  stationName: "KDVS",
  stationDetail: "90.3 FM · Davis, CA",
  showName: "Evergreen Radio",
  djName: "DJ Conifer",

  // Your public Spinitron DJ page. It lists all of your past playlists, and
  // clicking one opens that playlist inside the embedded frame.
  personaUrl: "https://spinitron.com/KDVS/dj/185737/DJ-Conifer",

  // OPTIONAL: episodes you want one-click buttons for above the frame.
  // Use the playlist page address from Spinitron (it contains /pl/).
  // Only https://spinitron.com/ addresses are accepted.
  pinned: [
    {
      label: "Oct 7, 2026",
      url: "https://spinitron.com/KDVS/pl/23142112/Evergreen-Radio",
    },
    // { label: "Another favorite episode", url: "https://spinitron.com/KDVS/pl/00000000/Evergreen-Radio" },
  ],
};
