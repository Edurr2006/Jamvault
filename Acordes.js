const acordesDB = {
  "C": {
    "Mayor": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "Menor": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 2 },
      { cuerda: 1, traste: 3, esRaiz: false, dedo: 3 }
    ],
    "7": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "maj7": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "m7": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 3 }
    ],
    "sus4": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "dim": [
      { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 }
    ]
  },

  "C#": {
    "Mayor": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 6, esRaiz: false, dedo: 4 }
    ],
    "Menor": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 4 },
      { cuerda: 2, traste: 5, esRaiz: false, dedo: 2 }
    ],
    "7": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 6, esRaiz: false, dedo: 4 }
    ],
    "maj7": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 5, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 6, esRaiz: false, dedo: 4 }
    ],
    "m7": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 5, esRaiz: false, dedo: 4 }
    ],
    "sus2": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 2 }
    ],
    "sus4": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 5, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 5, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 3 }
    ]
  },

  "D": {
    "Mayor": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 1, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "Menor": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 1, traste: 1, esRaiz: true, dedo: 1 }
    ],
    "7": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 2, esRaiz: true, dedo: 3 }
    ],
    "maj7": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 1, traste: 2, esRaiz: true, dedo: 1 }
    ],
    "m7": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 1, esRaiz: true, dedo: 3 }
    ],
    "sus2": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 0, esRaiz: true, dedo: 0 }
    ],
    "sus4": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 1, traste: 3, esRaiz: false, dedo: 1 }
    ],
    "dim": [
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 3 }
    ]
  },

  "D#": {
    "Mayor": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 8, esRaiz: false, dedo: 4 }
    ],
    "Menor": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 8, esRaiz: false, dedo: 4 },
      { cuerda: 2, traste: 7, esRaiz: false, dedo: 2 }
    ],
    "7": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 8, esRaiz: false, dedo: 4 }
    ],
    "maj7": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 7, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 8, esRaiz: false, dedo: 4 }
    ],
    "m7": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 7, esRaiz: false, dedo: 2 }
    ],
    "sus2": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 5, esRaiz: false, dedo: 1 } // Barre implied or stretch
    ],
    "sus4": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 8, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 7, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 1 } // Barre
    ]
  },

  "E": {
    "Mayor": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "Menor": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "7": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "maj7": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 }, // Hard to play, usually different voicing
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "m7": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "sus2": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 1 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 4 }
    ],
    "sus4": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 5, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 }
    ]
  },

  "F": {
    "Mayor": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 }
    ],
    "Menor": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "maj7": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 }
    ],
    "m7": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 } // Open D string
    ],
    "sus4": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 }
    ]
  },

  "F#": {
    "Mayor": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 2 }
    ],
    "Menor": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 2, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "maj7": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 2 }
    ],
    "m7": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 } // Stretch
    ],
    "sus4": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 6, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 3, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 }
    ]
  },

  "G": {
    "Mayor": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 2 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 1 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 1, traste: 3, esRaiz: false, dedo: 3 }
    ],
    "Menor": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 5, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 5, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 3, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 1, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "maj7": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 1, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "m7": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 5, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 3 },
      { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "sus4": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 5, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 5, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 6, traste: 3, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 4, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 5, esRaiz: false, dedo: 3 }
    ]
  },

  "G#": {
    "Mayor": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 5, esRaiz: false, dedo: 2 }
    ],
    "Menor": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 4 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 4, esRaiz: false, dedo: 1 },
      { cuerda: 1, traste: 4, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 1 }
    ],
    "maj7": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 5, esRaiz: false, dedo: 2 }
    ],
    "m7": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 1 } // Stretch
    ],
    "sus4": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 6, esRaiz: false, dedo: 3 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 6, traste: 4, esRaiz: true, dedo: 1 },
      { cuerda: 5, traste: 5, esRaiz: false, dedo: 2 },
      { cuerda: 4, traste: 6, esRaiz: false, dedo: 3 }
    ]
  },

  "A": {
    "Mayor": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 1 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 2, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
    ],
    "Menor": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 2, esRaiz: false, dedo: 3 }
    ],
    "maj7": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "m7": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
      { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 4 }
    ],
    "sus4": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 }
    ]
  },

  "A#": {
    "Mayor": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 4 }
    ],
    "Menor": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 4 },
      { cuerda: 2, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 1, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 4 }
    ],
    "maj7": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 }
    ],
    "m7": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 } // Open G string
    ],
    "sus4": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 5, traste: 1, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 3 }
    ]
  },

  "B": {
    "Mayor": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 2, traste: 4, esRaiz: false, dedo: 4 }
    ],
    "Menor": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 4 },
      { cuerda: 2, traste: 3, esRaiz: false, dedo: 2 },
      { cuerda: 1, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "7": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "maj7": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 3, esRaiz: false, dedo: 2 }
    ],
    "m7": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 2, esRaiz: false, dedo: 1 }
    ],
    "sus2": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 } // Stretch
    ],
    "sus4": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 4, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 4, esRaiz: false, dedo: 3 }
    ]
  }
};




// ------------------------- TEMAS -------------------------




// ------------------------- COORDENADAS -------------------------

function calcularX(cuerda) {
  const posiciones = {
    6: 23,
    5: 93,
    4: 170.5,
    3: 251,
    2: 329.5,
    1: 398
  };
  return posiciones[cuerda];
}

function calcularY(traste) {
  if (traste === 0) return 24;

  const fretPositions = {
    1: 82,
    2: 183,
    3: 270,
    4: 352,
    5: 435
  };
  return fretPositions[traste];
}


// ------------------------- MOSTRAR ACORDE -------------------------

function mostrarAcorde(root, tipo) {
  const svg = document.querySelector('#chordCanvas svg');
  // Limpiar acordes previos pero mantener las líneas y defs
  const elementos = svg.querySelectorAll('.chord-circle, .chord-label');
  elementos.forEach(e => e.remove());

  if (!acordesDB[root] || !acordesDB[root][tipo]) {
    alert('Acorde no disponible');
    return;
  }

  const posiciones = acordesDB[root][tipo];

  // Calcular el traste mínimo y máximo para determinar si necesitamos desplazar la vista
  let minFret = 20;
  let maxFret = 0;
  posiciones.forEach(pos => {
    if (pos.traste > 0) {
      if (pos.traste < minFret) minFret = pos.traste;
      if (pos.traste > maxFret) maxFret = pos.traste;
    }
  });

  // Si el acorde se sale del rango de 5 trastes (o empieza muy abajo), calculamos offset
  // Por defecto mostramos desde el traste 1.
  // Si maxFret > 5, movemos la ventana para que el traste más bajo (minFret) sea el 1 o 2 de la vista.
  // Una lógica simple: si minFret > 1, hacemos que startFret sea minFret (o minFret - 1 para dar aire).
  // Pero para mantener consistencia con diagramas típicos:
  // Si todo cabe en 1-5, startFret = 1.
  // Si no, startFret = minFret.

  let startFret = 1;
  if (maxFret > 5) {
    startFret = minFret;
  }

  // Si hay desplazamiento, mostrar el número de traste
  if (startFret > 1) {
    const labelFret = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelFret.setAttribute('x', '-5'); // Más a la izquierda para evitar solapamiento
    labelFret.setAttribute('y', calcularY(1) + 5); // Alineado con el primer traste visual
    labelFret.setAttribute('text-anchor', 'end');
    // labelFret.setAttribute('fill', 'white'); // Removed, handled by CSS .chord-label
    // labelFret.setAttribute('font-size', '18');
    // labelFret.setAttribute('font-weight', 'bold');
    labelFret.classList.add('chord-label');
    labelFret.textContent = `${startFret}`;
    svg.appendChild(labelFret);
  }

  // Detectar cejillas (barres)
  // Agrupar notas con dedo 1 en el mismo traste (si hay más de 1)
  const barreGroups = {};
  posiciones.forEach(pos => {
    if (pos.dedo === 1 && pos.traste > 0) {
      if (!barreGroups[pos.traste]) barreGroups[pos.traste] = [];
      barreGroups[pos.traste].push(pos);
    }
  });

  const barreNotes = new Set();

  // Renderizar barras
  Object.keys(barreGroups).forEach(trasteKey => {
    const notes = barreGroups[trasteKey];
    if (notes.length >= 2) {
      // Es una cejilla
      const traste = parseInt(trasteKey);

      // Encontrar cuerdas extremas
      let minX = 1000;
      let maxX = 0;

      notes.forEach(n => {
        barreNotes.add(n); // Marcar para no dibujar círculo individual
        const x = calcularX(n.cuerda);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      });

      // Calcular Y visual
      let visualFret = traste;
      if (traste > 0) {
        visualFret = traste - startFret + 1;
      }
      const y = calcularY(visualFret);

      // Dibujar la barra (rectángulo redondeado)
      const gBarre = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gBarre.classList.add('chord-circle'); // Para tomar el color del tema

      // Si la nota más grave es raíz, aplicar clase root-note
      const grave = notes.reduce((p, c) => (c.cuerda > p.cuerda ? c : p));
      if (grave.esRaiz) {
        gBarre.classList.add('root-note');
      }

      // Sombra
      const rectShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rectShadow.setAttribute('filter', 'url(#note-shadow)');
      const radius = 14;
      const height = 2 * radius; // 28
      const width = (maxX - minX) + 2 * 15.3; // Ancho entre centros + padding bordes (aprox radio)

      rectShadow.setAttribute('x', minX - 15.3);
      rectShadow.setAttribute('y', y - radius);
      rectShadow.setAttribute('width', width);
      rectShadow.setAttribute('height', height);
      rectShadow.setAttribute('rx', radius);
      rectShadow.setAttribute('ry', radius);

      // Borde
      rectShadow.setAttribute('stroke', 'black');
      rectShadow.setAttribute('stroke-width', '1');

      gBarre.appendChild(rectShadow);

      // Texto "1" en el centro
      const labelFinger = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelFinger.setAttribute('x', (minX + maxX) / 2);
      labelFinger.setAttribute('y', y + 5);
      labelFinger.setAttribute('text-anchor', 'middle');
      labelFinger.setAttribute('fill', 'black');
      labelFinger.setAttribute('font-size', '16');
      labelFinger.setAttribute('font-weight', 'bold');
      labelFinger.textContent = "1";
      gBarre.appendChild(labelFinger);

      svg.appendChild(gBarre);
    }
  });

  posiciones.forEach(pos => {
    // Si es parte de una cejilla, saltar (ya se dibujó la barra)
    if (barreNotes.has(pos)) return;

    const x = calcularX(pos.cuerda);

    let visualFret = pos.traste;
    if (pos.traste > 0) {
      visualFret = pos.traste - startFret + 1;
    }

    const y = calcularY(visualFret);

    // Grupo principal para la nota
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('chord-circle');
    if (pos.esRaiz) g.classList.add('root-note');

    // 1. Grupo para la sombra (usando el filtro definido en HTML)
    const gShadow = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gShadow.setAttribute('filter', 'url(#note-shadow)');

    const ellipseShadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipseShadow.setAttribute('cx', x);
    ellipseShadow.setAttribute('cy', y);
    ellipseShadow.setAttribute('rx', '15.3');
    ellipseShadow.setAttribute('ry', '14');

    // Borde negro
    ellipseShadow.setAttribute('stroke', 'black');
    ellipseShadow.setAttribute('stroke-width', '1');

    gShadow.appendChild(ellipseShadow);
    g.appendChild(gShadow);

    // 2. Texto del dedo
    const dedo = pos.dedo;
    if (dedo !== undefined && dedo > 0) {
      const labelFinger = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelFinger.setAttribute('x', x);
      labelFinger.setAttribute('y', y + 5);
      labelFinger.setAttribute('text-anchor', 'middle');
      labelFinger.setAttribute('fill', 'black');
      labelFinger.setAttribute('font-size', '16');
      labelFinger.setAttribute('font-weight', 'bold');
      labelFinger.textContent = dedo;
      g.appendChild(labelFinger);
    }

    svg.appendChild(g);
  });
}


// ------------------------- EVENT LISTENERS -------------------------

document.addEventListener('DOMContentLoaded', () => {
  const btnShow = document.getElementById('showChord');
  const selectRoot = document.getElementById('rootNote');
  const selectType = document.getElementById('chordType');

  if (btnShow) {
    btnShow.addEventListener('click', () => {
      const root = selectRoot.value;
      const type = selectType.value;

      if (root && type) {
        mostrarAcorde(root, type);
      } else {
        alert('Por favor selecciona una nota y un tipo de acorde.');
      }
    });
  }
});
