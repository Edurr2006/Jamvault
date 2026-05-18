const acordesDB = {
  "C": {
    "Mayor": [
      [
        { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
        { cuerda: 4, traste: 2, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
        { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
      ],
      [
        { cuerda: 5, traste: 3, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 5, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 5, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 5, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 3, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 6, traste: 8, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 10, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 10, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 9, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 8, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 8, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 10, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 12, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 13, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 12, esRaiz: false, dedo: 3 }
      ]
    ],
    "Menor": [
      [
        { cuerda: 5, traste: 3, esRaiz: true, dedo: 3 },
        { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 },
        { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
        { cuerda: 2, traste: 1, esRaiz: false, dedo: 2 },
        { cuerda: 1, traste: 3, esRaiz: false, dedo: 3 }
      ],
      [
        { cuerda: 5, traste: 3, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 5, esRaiz: false, dedo: 3 },
        { cuerda: 3, traste: 5, esRaiz: false, dedo: 4 },
        { cuerda: 2, traste: 4, esRaiz: false, dedo: 2 },
        { cuerda: 1, traste: 3, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 6, traste: 8, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 10, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 10, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 8, esRaiz: false, dedo: 1 },
        { cuerda: 2, traste: 8, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 8, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 10, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 12, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 13, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 11, esRaiz: false, dedo: 2 }
      ]
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
      [
        { cuerda: 4, traste: 0, esRaiz: true, dedo: 0 },
        { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 3, esRaiz: false, dedo: 3 },
        { cuerda: 1, traste: 2, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 5, traste: 5, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 7, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 7, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 7, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 5, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 6, traste: 10, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 12, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 12, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 11, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 10, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 10, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 12, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 14, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 15, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 14, esRaiz: false, dedo: 3 }
      ]
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
      { cuerda: 3, traste: 5, esRaiz: false, dedo: 1 } // Cejilla implícita o estiramiento
    ],
    "sus4": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 8, esRaiz: false, dedo: 3 },
      { cuerda: 3, traste: 8, esRaiz: false, dedo: 4 }
    ],
    "dim": [
      { cuerda: 5, traste: 6, esRaiz: true, dedo: 1 },
      { cuerda: 4, traste: 7, esRaiz: false, dedo: 2 },
      { cuerda: 3, traste: 6, esRaiz: false, dedo: 1 } // Cejilla
    ]
  },

  "E": {
    "Mayor": [
      [
        { cuerda: 6, traste: 0, esRaiz: true, dedo: 0 },
        { cuerda: 5, traste: 2, esRaiz: false, dedo: 2 },
        { cuerda: 4, traste: 2, esRaiz: false, dedo: 3 },
        { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 },
        { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
        { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
      ],
      [
        { cuerda: 5, traste: 7, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 9, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 9, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 9, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 7, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 2, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 4, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 5, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 4, esRaiz: false, dedo: 2 }
      ],
      [
        { cuerda: 6, traste: 12, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 14, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 14, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 13, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 12, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 12, esRaiz: false, dedo: 1 }
      ]
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
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 }, // Difícil de tocar, normalmente otra posición
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
      [
        { cuerda: 6, traste: 1, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 3, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 3, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 1, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 1, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 3, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 5, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 6, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 5, esRaiz: false, dedo: 2 }
      ],
      [
        { cuerda: 5, traste: 8, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 10, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 10, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 10, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 8, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 6, traste: 13, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 15, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 15, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 14, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 13, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 13, esRaiz: false, dedo: 1 }
      ]
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
      { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 } // Cuerda Re al aire
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
      { cuerda: 4, traste: 1, esRaiz: false, dedo: 1 } // Estiramiento
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
      [
        { cuerda: 6, traste: 3, esRaiz: true, dedo: 2 },
        { cuerda: 5, traste: 2, esRaiz: false, dedo: 1 },
        { cuerda: 4, traste: 0, esRaiz: false, dedo: 0 },
        { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 },
        { cuerda: 2, traste: 0, esRaiz: false, dedo: 0 },
        { cuerda: 1, traste: 3, esRaiz: false, dedo: 3 }
      ],
      [
        { cuerda: 6, traste: 3, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 5, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 5, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 4, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 3, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 3, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 5, traste: 10, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 9, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 7, esRaiz: false, dedo: 1 },
        { cuerda: 2, traste: 8, esRaiz: false, dedo: 3 },
        { cuerda: 1, traste: 7, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 5, traste: 10, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 12, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 12, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 12, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 10, esRaiz: false, dedo: 1 }
      ]
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
      { cuerda: 4, traste: 3, esRaiz: false, dedo: 1 } // Estiramiento
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
      [
        { cuerda: 5, traste: 0, esRaiz: true, dedo: 0 },
        { cuerda: 4, traste: 2, esRaiz: false, dedo: 1 },
        { cuerda: 3, traste: 2, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 2, esRaiz: false, dedo: 3 },
        { cuerda: 1, traste: 0, esRaiz: false, dedo: 0 }
      ],
      [
        { cuerda: 6, traste: 5, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 7, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 7, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 6, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 5, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 5, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 7, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 9, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 10, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 9, esRaiz: false, dedo: 2 }
      ],
      [
        { cuerda: 5, traste: 12, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 14, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 14, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 14, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 12, esRaiz: false, dedo: 1 }
      ]
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
      { cuerda: 3, traste: 0, esRaiz: false, dedo: 0 } // Cuerda Sol al aire
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
      [
        { cuerda: 5, traste: 2, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 4, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 4, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 4, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 2, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 6, traste: 7, esRaiz: true, dedo: 1 },
        { cuerda: 5, traste: 9, esRaiz: false, dedo: 3 },
        { cuerda: 4, traste: 9, esRaiz: false, dedo: 4 },
        { cuerda: 3, traste: 8, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 7, esRaiz: false, dedo: 1 },
        { cuerda: 1, traste: 7, esRaiz: false, dedo: 1 }
      ],
      [
        { cuerda: 4, traste: 9, esRaiz: true, dedo: 1 },
        { cuerda: 3, traste: 11, esRaiz: false, dedo: 2 },
        { cuerda: 2, traste: 12, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 11, esRaiz: false, dedo: 3 }
      ],
      [
        { cuerda: 5, traste: 14, esRaiz: true, dedo: 1 },
        { cuerda: 4, traste: 16, esRaiz: false, dedo: 2 },
        { cuerda: 3, traste: 16, esRaiz: false, dedo: 3 },
        { cuerda: 2, traste: 16, esRaiz: false, dedo: 4 },
        { cuerda: 1, traste: 14, esRaiz: false, dedo: 1 }
      ]
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
      { cuerda: 3, traste: 1, esRaiz: false, dedo: 1 } // Estiramiento
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
};// ------------------------- ESTADO GLOBAL -------------------------
let currentRoot = null;
let currentType = null;
let currentPositionIndex = 0;

function getPositions(root, type) {
  if (!acordesDB[root] || !acordesDB[root][type]) return [];
  const data = acordesDB[root][type];
  return Array.isArray(data[0]) ? data : [data];
}




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

function mostrarAcorde(root, tipo, index = 0) {
  currentRoot = root;
  currentType = tipo;
  currentPositionIndex = index;

  const positions = getPositions(root, tipo);
  if (positions.length === 0) {
    showToast('Acorde no disponible', 'warning');
    return;
  }

  const data = positions[index];
  renderizarDiagrama(data);
  actualizarNavegacion(positions.length, index);
}

function renderizarDiagrama(posiciones) {
  const svg = document.querySelector('#chordCanvas svg');
  // Limpiar acordes previos pero mantener las líneas y defs
  const elementos = svg.querySelectorAll('.chord-circle, .chord-label');
  elementos.forEach(e => e.remove());

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
    const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    badgeGroup.classList.add('chord-label', 'fret-badge-group');

    const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeRect.setAttribute('x', '-48');
    badgeRect.setAttribute('y', calcularY(1) - 20);
    badgeRect.setAttribute('width', '45');
    badgeRect.setAttribute('height', '40');
    badgeRect.setAttribute('rx', '12');
    badgeRect.classList.add('fret-badge-bg');

    const labelFret = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelFret.setAttribute('x', '-25.5');
    labelFret.setAttribute('y', calcularY(1) + 7);
    labelFret.setAttribute('text-anchor', 'middle');
    labelFret.setAttribute('font-size', '18');
    labelFret.setAttribute('font-weight', 'bold');
    labelFret.classList.add('fret-badge-text');
    labelFret.textContent = `${startFret}fr`;

    badgeGroup.appendChild(badgeRect);
    badgeGroup.appendChild(labelFret);
    svg.appendChild(badgeGroup);
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

  // Renderizar barras con animación escalonada
  let animationDelay = 0;
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
      // Removed filter injection to use CSS
      const radius = 19;
      const height = 2 * radius; // 38
      const width = (maxX - minX) + 2 * 19; // Ancho entre centros + padding bordes (aprox radio)

      rectShadow.setAttribute('x', minX - 19);
      rectShadow.setAttribute('y', y - radius);
      rectShadow.setAttribute('width', width);
      rectShadow.setAttribute('height', height);
      rectShadow.setAttribute('rx', radius);
      rectShadow.setAttribute('ry', radius);

      gBarre.appendChild(rectShadow);

      // Texto "1" en el centro
      const labelFinger = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelFinger.setAttribute('x', (minX + maxX) / 2);
      labelFinger.setAttribute('y', y + 7);
      labelFinger.setAttribute('text-anchor', 'middle');
      labelFinger.setAttribute('fill', 'black');
      labelFinger.setAttribute('font-size', '20');
      labelFinger.setAttribute('font-weight', 'bold');
      labelFinger.textContent = "1";
      gBarre.appendChild(labelFinger);

      gBarre.style.animationDelay = `${animationDelay}ms`;
      animationDelay += 40;
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
    // Removed filter injection to use CSS

    const ellipseShadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipseShadow.setAttribute('cx', x);
    ellipseShadow.setAttribute('cy', y);
    ellipseShadow.setAttribute('rx', '19');
    ellipseShadow.setAttribute('ry', '19');

    gShadow.appendChild(ellipseShadow);
    g.appendChild(gShadow);

    // 2. Texto del dedo
    const dedo = pos.dedo;
    if (dedo !== undefined && dedo > 0) {
      const labelFinger = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelFinger.setAttribute('x', x);
      labelFinger.setAttribute('y', y + 7);
      labelFinger.setAttribute('text-anchor', 'middle');
      labelFinger.setAttribute('fill', 'black');
      labelFinger.setAttribute('font-size', '20');
      labelFinger.setAttribute('font-weight', 'bold');
      labelFinger.textContent = dedo;
      g.appendChild(labelFinger);
    }

    g.style.animationDelay = `${animationDelay}ms`;
    animationDelay += 40;
    svg.appendChild(g);
  });
}

function actualizarNavegacion(total, actual) {
  const info = document.getElementById('chordPositionsInfo');
  const count = document.getElementById('positionsCount');
  const dotsContainer = document.getElementById('positionDots');
  const btnPrev = document.getElementById('prevChord');
  const btnNext = document.getElementById('nextChord');

  if (total > 1) {
    info.style.display = 'block';
    count.textContent = total;
    dotsContainer.style.display = 'flex';
    btnPrev.style.display = 'flex';
    btnNext.style.display = 'flex';

    // Generar dots
    dotsContainer.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = i === actual ? 'dot active' : 'dot';
      dot.onclick = () => mostrarAcorde(currentRoot, currentType, i);
      dotsContainer.appendChild(dot);
    }
  } else {
    info.style.display = 'none';
    dotsContainer.style.display = 'none';
    btnPrev.style.display = 'none';
    btnNext.style.display = 'none';
  }
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
        mostrarAcorde(root, type, 0);
      } else {
        showToast('Por favor selecciona una nota y un tipo de acorde.', 'info');
      }
    });
  }

  const btnPrev = document.getElementById('prevChord');
  const btnNext = document.getElementById('nextChord');

  if (btnPrev && btnNext) {
    btnPrev.onclick = () => {
      const positions = getPositions(currentRoot, currentType);
      if (positions.length > 0) {
        let newIndex = currentPositionIndex - 1;
        if (newIndex < 0) newIndex = positions.length - 1;
        mostrarAcorde(currentRoot, currentType, newIndex);
      }
    };

    btnNext.onclick = () => {
      const positions = getPositions(currentRoot, currentType);
      if (positions.length > 0) {
        let newIndex = (currentPositionIndex + 1) % positions.length;
        mostrarAcorde(currentRoot, currentType, newIndex);
      }
    };
  }
});
