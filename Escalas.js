document.getElementById("showScale").addEventListener("click", mostrarEscala);

function mostrarEscala() {
  var root = document.getElementById("rootNote").value;
  var tipo = document.getElementById("scaleType").value;
  if (!root || !tipo) {
    alert("Selecciona una nota raíz y un tipo de escala");
    return;
  }

  // Patrones de escalas en semitonos
  var patrones = {
    major:            [0, 2, 4, 5, 7, 9, 11],
    natural_minor:    [0, 2, 3, 5, 7, 8, 10],
    harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
    melodic_minor:    [0, 2, 3, 5, 7, 9, 11],
    pentatonic_major: [0, 2, 4, 7, 9],
    pentatonic_minor: [0, 3, 5, 7, 10],
    blues:            [0, 3, 5, 6, 7, 10],
    dorian:           [0, 2, 3, 5, 7, 9, 10],
    mixolydian:       [0, 2, 4, 5, 7, 9, 10],
    // Nueva: cromática → todas las 12 notas
    chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  };

  // Notas en orden cromático
  var notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Verificar si el tipo de escala existe
  if (!patrones[tipo]) {
    alert("Tipo de escala no válido");
    return;
  }

  var rootIndex = notas.indexOf(root);
  if (rootIndex === -1) {
    alert("Nota raíz no válida");
    return;
  }

  // Calcular notas que forman la escala
  var escala = patrones[tipo].map(function(intervalo) {
    return notas[(rootIndex + intervalo) % 12];
  });

  // Ocultar todas las notas
  var todas = document.querySelectorAll("#fretboard g.note");
  todas.forEach(function(n) {
    n.style.display = "none";
  });

  // Mostrar solo las notas que pertenecen a la escala
 // Mostrar solo las notas que pertenecen a la escala
escala.forEach(function(nota) {
  var coincidencias = document.querySelectorAll('#fretboard g[data-note="' + nota + '"]');
  coincidencias.forEach(function(n) {
    n.style.display = "block";
    
    // Agregar clase root-note si es la nota raíz
    if (nota === root) {
      n.classList.add('root-note');
    } else {
      n.classList.remove('root-note');
    }
    
    // Ya no necesitas el setAttribute("fill") porque el CSS lo maneja
  });
});
}
