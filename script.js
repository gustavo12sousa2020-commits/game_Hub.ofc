let noticias = [];
let categoriaAtual = "todas";

// 📰 Carregar notícias da API
async function carregar() {

    const news = document.getElementById("news");

    try {

        const res = await fetch("/api/noticias");
        noticias = await res.json();

        if (!Array.isArray(noticias)) {
            throw new Error("Resposta inválida");
        }

        render();

    } catch (erro) {
        news.innerHTML = `
            <div class="estado-vazio">
                ${ICONS.frown}
                <p>Não foi possível carregar as notícias agora.</p>
                <button onclick="carregar()">Tentar de novo</button>
            </div>
        `;
        document.getElementById("destaque").innerHTML = "";
    }

}

// 🖼️ Renderizar destaque + grid
function render() {

    const destaqueDiv = document.getElementById("destaque");
    const box = document.getElementById("news");

    box.innerHTML = "";
    destaqueDiv.innerHTML = "";

    const filtradas = noticias.filter(n => pertenceCategoria(n, categoriaAtual));

    if (filtradas.length === 0) {
        destaqueDiv.innerHTML = "";
        box.innerHTML = `
            <div class="estado-vazio">
                ${ICONS.search}
                <p>Nenhuma notícia encontrada nessa categoria.</p>
            </div>
        `;
        return;
    }

    // índices reais na lista completa (pra abrir() funcionar certo)
    const indices = filtradas.map(n => noticias.indexOf(n));

    // 🌟 Destaque (primeira notícia da categoria)
    const principal = filtradas[0];
    const indicePrincipal = indices[0];

    destaqueDiv.innerHTML = `
        <div class="destaque" onclick="abrir(${indicePrincipal})">
            <div class="img-wrap">
                ${imgTag(principal.urlToImage)}
            </div>
            <div class="destaque-info">
                <div class="tags-row">
                    <span class="tag">Destaque</span>
                    ${badgeTag(principal)}
                </div>
                <h3>${principal.title}</h3>
                <p>${principal.description || "Sem descrição"}</p>
                <button onclick="event.stopPropagation(); abrir(${indicePrincipal})">Ver notícia</button>
            </div>
        </div>
    `;

    // demais notícias em grid
    filtradas.slice(1).forEach((n, i) => {

        const indiceReal = indices[i + 1];

        box.innerHTML += `
            <div class="card" onclick="abrir(${indiceReal})">
                <div class="img-wrap">
                    ${imgTag(n.urlToImage)}
                </div>
                ${badgeTag(n)}
                <h3>${n.title}</h3>
                <p>${n.description || "Sem descrição"}</p>
                <button onclick="event.stopPropagation(); abrir(${indiceReal})">Ver notícia</button>
            </div>
        `;

    });

}

// 🏷️ Cliques no menu de categorias
document.querySelectorAll("nav button").forEach(botao => {

    botao.addEventListener("click", () => {

        document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
        botao.classList.add("active");

        categoriaAtual = botao.dataset.categoria;

        document.getElementById("search").value = "";

        render();

        // fecha o menu mobile ao escolher categoria
        document.getElementById("nav").classList.remove("aberto");

    });

});

// 🔎 Pesquisa
document.getElementById("search").addEventListener("input", e => {

    const v = e.target.value.toLowerCase();

    document.querySelectorAll("#news .card, .destaque").forEach(card => {
        const match = card.innerText.toLowerCase().includes(v);
        card.style.display = match ? "" : "none";
    });

});

// 📰 Abrir notícia
function abrir(i) {
    localStorage.setItem("news", JSON.stringify(noticias[i]));
    window.location.href = "noticia.html";
}

// ⏰ Relógio
function atualizarRelogio() {
    document.getElementById("relogio").innerText =
        new Date().toLocaleTimeString();
}

setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// 🔝 Botão topo
document.getElementById("topoBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// 📱 Menu mobile
document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("nav").classList.toggle("aberto");
});

carregar();

// 💚 Pix
function copiarPix() {
    navigator.clipboard.writeText("gustavo12sousa2020@gmail.com");
    const btn = document.getElementById("pixBtnText");
    btn.textContent = "Copiado! ✓";
    setTimeout(() => btn.textContent = "Copiar chave", 2000);
}

// 🏆 Doadores
async function carregarDoadores() {
    const lista = document.getElementById("doadores-lista");
    try {
        const res = await fetch("/api/doadores");
        const doadores = await res.json();

        const NIVEIS = [
            { min: 60,  emoji: "👑", label: "Lendário" },
            { min: 30,  emoji: "💎", label: "Diamante" },
            { min: 15,  emoji: "🥇", label: "Ouro" },
            { min: 5,   emoji: "🥈", label: "Prata" },
            { min: 0,   emoji: "🥉", label: "Bronze" }
        ];

        function nivel(valor) {
            return NIVEIS.find(n => valor >= n.min) || NIVEIS[NIVEIS.length - 1];
        }

        if (doadores.length === 0) {
            lista.innerHTML = `<p style="color:#666;font-size:13px;text-align:center;">Seja o primeiro apoiador! 💚</p>`;
            return;
        }

        lista.innerHTML = doadores.map((d, i) => {
            const nv = nivel(d.valor);
            return `
                <div class="doador-row">
                    <span class="doador-pos">${i + 1}</span>
                    <span class="doador-emoji">${nv.emoji}</span>
                    <span class="doador-nome">${d.nome}</span>
                    <span class="doador-nivel">${nv.label}</span>
                    <span class="doador-valor">R$ ${d.valor}</span>
                </div>
            `;
        }).join("");

    } catch {
        lista.innerHTML = `<p style="color:#666;font-size:13px;text-align:center;">Erro ao carregar.</p>`;
    }
}

carregarDoadores();
