// 🖼️ Placeholder local (sem depender de serviço externo)
const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
            <rect width="400" height="225" fill="#1c1c1c"/>
            <text x="50%" y="50%" font-size="40" fill="#444" text-anchor="middle" dominant-baseline="middle" font-family="Arial">🎮</text>
        </svg>
    `);

function imgTag(url) {
    const src = url || PLACEHOLDER;
    return `<img src="${src}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">`;
}

// 🏷️ Categorias por palavras-chave
const REGEX_CATEGORIAS = {
    esports: /esports?|campeonato|torneio|valorant|cs2|counter-strike|league of legends|free fire|major|mundial|liga|e-sport/i,
    tecnologia: /tecnologia|smartphone|hardware|intelig[eê]ncia artificial|\bia\b|chip|processador|notebook|gadget|aplicativo|drone|tablet/i,
    anime: /anime|mang[aá]|otaku|naruto|one piece|dragon ball|crunchyroll|funimation|shonen|manhwa/i,
    jogos: /jogo|game|gameplay|console|playstation|xbox|nintendo|steam|dlc|lan[çc]amento|rpg|fps|gta|minecraft/i
};

const CATEGORIA_LABELS = {
    jogos: "Jogos",
    esports: "Esports",
    tecnologia: "Tecnologia",
    anime: "Anime"
};

// 🏷️ Categoria principal de uma notícia (pra mostrar a tag)
function getCategoria(noticia) {

    const texto = `${noticia.title} ${noticia.description || ""}`;

    if (REGEX_CATEGORIAS.esports.test(texto)) return "esports";
    if (REGEX_CATEGORIAS.anime.test(texto)) return "anime";
    if (REGEX_CATEGORIAS.tecnologia.test(texto)) return "tecnologia";

    return "jogos";

}

function pertenceCategoria(noticia, categoria) {
    if (categoria === "todas") return true;

    if (categoria === "jogos") {
        return getCategoria(noticia) === "jogos";
    }

    const texto = `${noticia.title} ${noticia.description || ""}`;
    const regex = REGEX_CATEGORIAS[categoria];

    return regex ? regex.test(texto) : true;
}

function badgeTag(noticia) {
    const cat = getCategoria(noticia);
    return `<span class="badge badge-${cat}">${CATEGORIA_LABELS[cat]}</span>`;
}
