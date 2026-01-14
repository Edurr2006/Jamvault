document.getElementById("showScale").addEventListener("click", mostrarEscala);

function mostrarEscala() {
  var root = document.getElementById("rootNote").value;
  var tipo = document.getElementById("scaleType").value;
  if (!root || !tipo) {
    showToast("Selecciona una nota raíz y un tipo de escala", "info");
    return;
  }

  // Patrones de escalas en semitonos
  var patrones = {
    major: [0, 2, 4, 5, 7, 9, 11],
    natural_minor: [0, 2, 3, 5, 7, 8, 10],
    harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
    melodic_minor: [0, 2, 3, 5, 7, 9, 11],
    pentatonic_major: [0, 2, 4, 7, 9],
    pentatonic_minor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    // Nueva: cromática → todas las 12 notas
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  };

  // Notas en orden cromático
  var notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Verificar si el tipo de escala existe
  if (!patrones[tipo]) {
    showToast("Tipo de escala no válido", "error");
    return;
  }

  var rootIndex = notas.indexOf(root);
  if (rootIndex === -1) {
    showToast("Nota raíz no válida", "error");
    return;
  }

  // Calcular notas que forman la escala
  var escala = patrones[tipo].map(function (intervalo) {
    return notas[(rootIndex + intervalo) % 12];
  });

  // Cache elements if not already done (Optimization)
  if (!window.notesCache) {
    window.notesCache = new Map();
    document.querySelectorAll("#fretboard g.note").forEach(n => {
      const noteName = n.getAttribute('data-note');
      if (!window.notesCache.has(noteName)) {
        window.notesCache.set(noteName, []);
      }
      window.notesCache.get(noteName).push(n);
    });
  }

  // Create a Set of scale notes for O(1) lookup
  var scaleSet = new Set(escala);

  // Optimized rendering loop: Single pass through all note types
  // We iterate through our cache to determine what to show/hide
  // This preserves "musical order" animation if we iterate the 'escala' array,
  // OR we can iterate the cache keys. To keep the requested "fluidez" and animation style:

  // 1. Hide all notes first (efficiently)
  window.notesCache.forEach(notes => {
    notes.forEach(n => {
      n.style.display = "none";
      n.classList.remove('scale-note-appear');
      n.classList.remove('root-note');
      n.style.opacity = ""; // Reset inline opacity
    });
  });

  // 2. Show only scale notes with staggered animation
  let animationDelay = 0;

  // Iterate strictly in the order of the scale (musical order)
  escala.forEach(noteName => {
    const notes = window.notesCache.get(noteName);
    if (notes) {
      notes.forEach(n => {
        n.style.display = "block";
        n.style.opacity = "0"; // Start invisible

        if (noteName === root) {
          n.classList.add('root-note');
        }

        // Use requestAnimationFrame for smoother start
        requestAnimationFrame(() => {
          setTimeout(() => {
            n.classList.add('scale-note-appear');
            // Cleanup opacity after animation
            setTimeout(() => {
              n.style.opacity = "1";
            }, 400);
          }, animationDelay);
        });
      });
      animationDelay += 20; // Stagger per note type
    }
  });
}
