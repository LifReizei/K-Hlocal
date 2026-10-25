// Historial Local para Kino — v1.0.0

const STORAGE_KEY = "historial_guardado";

// 1. Leer y escribir en el almacenamiento local
async function getHistory() {
  try {
    const data = await kino.storage.get(STORAGE_KEY);
    return data || [];
  } catch (e) {
    return [];
  }
}

async function saveHistory(history) {
  await kino.storage.set(STORAGE_KEY, history);
}

// 2. Escuchar los eventos del reproductor
export async function track(event) {
  // event suele tener: { id, title, poster, type, season, episode, progress, duration, ref, ... }
  if (!event || !event.id) return;

  let history = await getHistory();

  // Buscar si ya existe este episodio/película en el historial
  const index = history.findIndex(
    (item) => item.id === event.id && item.season === event.season && item.episode === event.episode
  );

  const newItem = {
    id: event.id,
    title: event.title || "Desconocido",
    poster: event.poster || null,
    type: event.type || "series",
    season: event.season || null,
    episode: event.episode || null,
    progress: event.progress || 0,
    duration: event.duration || 0,
    ref: event.ref, // Guardamos la referencia original para poder reanudar
    updatedAt: Date.now()
  };

  if (index !== -1) {
    history[index] = newItem;
  } else {
    history.push(newItem);
  }

  // Ordenar por lo más reciente
  history.sort((a, b) => b.updatedAt - a.updatedAt);

  // Limitar a los últimos 50 elementos para no llenar la memoria
  history = history.slice(0, 50);

  await saveHistory(history);
}

// 3. Dibujar la interfaz de la sección
export async function section(arg) {
  const history = await getHistory();

  if (history.length === 0) {
    return {
      rows: [
        {
          id: "vacio",
          title: "Aún no has visto nada",
          items: []
        }
      ]
    };
  }

  // Convertir nuestro historial al formato de tarjeta que entiende Kino
  const items = history.map((item) => {
    const porcentaje = item.duration > 0 ? Math.round((item.progress / item.duration) * 100) : 0;
    
    let tituloMostrar = item.title;
    if (item.type === "series" && item.season && item.episode) {
      tituloMostrar = `${item.title} - T${item.season}E${item.episode}`;
    }

    return {
      id: item.id + "_" + (item.season || "movie") + "_" + (item.episode || "1"),
      title: tituloMostrar,
      poster: item.poster,
      kind: item.type,
      ref: item.ref, 
      badges: [`${porcentaje}% Visto`]
    };
  });

  return {
    rows: [
      {
        id: "continuar",
        title: "Continuar Viendo",
        items: items
      }
    ]
  };
}

// 4. Función para cuando haces clic en una tarjeta del historial
export async function resolve(ref) {
  // Nota: Para que esto funcione, la app de Kino debe saber qué plugin original
  // contiene ese ref. Como es un plugin local, si intentas reproducir desde aquí
  // y el plugin de origen (ej. AnimeAV1) no está activo, podría dar error.
  // La forma más sencilla es devolver el ref tal cual para que Kino intente buscarlo.
  throw kino.error("unavailable", "Abre el plugin original para reproducir este elemento.");
}