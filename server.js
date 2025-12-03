import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Servir archivos estáticos desde el directorio actual
app.use(express.static(__dirname));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "JamstudioPro.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🎸 JamStudio Pro corriendo en http://localhost:${PORT}`);
  console.log(`Abre tu navegador en esa dirección`);
});
