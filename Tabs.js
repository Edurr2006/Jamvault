document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("searchInput").value.trim();
  const resultsDiv = document.getElementById("results");

  if (!query) return alert("Por favor escribe algo para buscar.");

  resultsDiv.innerHTML = "<p>Abriendo resultados en Songsterr... 🎸</p>";

  const songsterrURL = `https://www.songsterr.com/?pattern=${encodeURIComponent(query)}`;
  window.open(songsterrURL, '_blank');
});
