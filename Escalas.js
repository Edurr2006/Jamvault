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
    // Nueva: cromática -> todas las 12 notas
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

  // Cachear elementos si no se ha hecho ya (Optimización)
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

  // Crear un Set de notas de la escala para búsqueda O(1)
  var scaleSet = new Set(escala);

  // Bucle de renderizado optimizado: Una sola pasada por todos los tipos de notas
  // Iteramos a través de nuestro caché para determinar qué mostrar/ocultar
  // Esto preserva la animación de "orden musical" si iteramos el array 'escala',
  // O podemos iterar las claves del caché. Para mantener la "fluidez" solicitada y el estilo de animación:

  // 1. Ocultar todas las notas primero (eficientemente)
  window.notesCache.forEach(notes => {
    notes.forEach(n => {
      n.style.display = "none";
      n.classList.remove('scale-note-appear');
      n.classList.remove('root-note');
      n.style.opacity = ""; // Restablecer opacidad inline
    });
  });

  // 2. Mostrar solo las notas de la escala con animación escalonada
  let animationDelay = 0;

  // Iterar estrictamente en el orden de la escala (orden musical)
  escala.forEach(noteName => {
    const notes = window.notesCache.get(noteName);
    if (notes) {
      notes.forEach(n => {
        n.style.display = "block";
        n.style.opacity = "0"; // Empezar invisible

        if (noteName === root) {
          n.classList.add('root-note');
        }

        // Usar requestAnimationFrame para un inicio más suave
        requestAnimationFrame(() => {
          setTimeout(() => {
            n.classList.add('scale-note-appear');
            // Limpiar opacidad después de la animación
            setTimeout(() => {
              n.style.opacity = "1";
            }, 400);
          }, animationDelay);
        });
      });
      animationDelay += 20; // Escalonamiento por tipo de nota
    }
  });
}
